import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { createFakeRestBackend } from "@/test/fakeApi";
import { Reservas } from "./ReservasPage";
import { createTestQueryClient } from "@/test/queryWrapper";
import { AuthProvider } from "@/context/AuthContext";
import { ROLES } from "@/services/core/roles";

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@/services/core/http", () => ({
  apiFetch: apiFetchMock,
  AUTH_EXPIRED_EVENT: "parku:auth-expired",
  crearConRespaldo: async (
    path: string,
    body: unknown,
    fetchTodosCrudo: () => Promise<any[]>,
  ) => {
    const creado = await apiFetchMock(path, { method: "POST", body });
    if (creado) return creado;
    const todos = await fetchTodosCrudo();
    return todos.reduce((max: any, item: any) =>
      item.id > max.id ? item : max,
    );
  },
}));

const vehiculos = createFakeRestBackend("/vehiculos", [
  {
    id: 1,
    placa: "ABC123",
    tipo: "CARRO",
    marca: "Chevrolet",
    linea: "Spark",
    modelo: 2020,
    color: "Rojo",
    observaciones: null,
    estado: true,
    conductores: [
      {
        id: 1,
        nombre_apellidos: "Conductor Uno",
        DetallePropiedad: { es_principal: true },
      },
    ],
    conductor_principal_id: 1,
    conductor_principal_nombre: "Conductor Uno",
  },
]);
const celdas = createFakeRestBackend("/celdas", [
  {
    id: 1,
    parqueadero: 1,
    numero: "C-001",
    tipo: "CARRO",
    usabilidad: "GENERAL",
    estado: "DISPONIBLE",
    observaciones: null,
  },
]);
const conductores = createFakeRestBackend("/conductores", [
  {
    id: 1,
    usuario_id: null,
    tipo_documento: "CC",
    numero_documento: "123",
    nombre_apellidos: "Conductor Uno",
    correo: "conductor1@sena.edu.co",
    direccion: null,
    numero_telefonico: "3201234567",
    tipo_usuario_id: 1,
    tipo_usuario_nombre: "Aprendiz",
    regional_formacion: null,
    centro_formacion: "Centro de Electricidad",
    programa_formacion: null,
    vigencia: null,
    movilidad_reducida: false,
    tipo_discapacidad: null,
    estado: true,
  },
]);
const parqueaderos = createFakeRestBackend("/parqueaderos", [
  {
    id: 1,
    nombre: "PQ Uno",
    ubicacion: "Regional",
    acceso: "REGIONAL",
    capacidad_maxima: 10,
    hora_apertura: "06:00:00",
    hora_cierre: "20:00:00",
    estado: true,
    zona: "",
    piso: "",
    descripcion: "",
    tipo: "GENERAL",
  },
]);
const reservas = createFakeRestBackend("/reservas", [], {
  actions: [
    {
      method: "PATCH",
      pattern: /^\/(\d+)\/estado$/,
      handle: (m, body, items) => {
        const idx = items.findIndex((i) => i.id === Number(m[1]));
        if (idx === -1) throw new Error("404");
        const b = body as any;
        items[idx] = {
          ...items[idx],
          estado: b.estado,
          ...(b.motivo_rechazo !== undefined
            ? { motivo_rechazo: b.motivo_rechazo }
            : {}),
        };
        return items[idx];
      },
    },
  ],
});

function sesionUsuario(rol: number) {
  return {
    id: "9",
    correo: "staff@sena.edu.co",
    nombre: "Staff Prueba",
    numero: "",
    rol,
  };
}

// El helper genérico espera basePath == prefijo exacto del path recibido — como
// varios dominios comparten un solo mock de apiFetch en este test, se enruta
// por prefijo hacia el backend correspondiente en vez de usar cada uno "suelto".
// `/auth/verificar` se responde aparte (no es un recurso CRUD): AuthProvider lo
// llama al montar si hay un token guardado, y si falla cierra la sesión local
// (ver AuthContext.tsx) — por eso debe devolver algo válido, no solo no-matchear.
apiFetchMock.mockImplementation(async (path: string, opts?: object) => {
  if (path === "/auth/verificar") {
    const raw = localStorage.getItem("parkUUser");
    if (!raw) throw new Error("No autenticado");
    const u = JSON.parse(raw);
    return {
      success: true,
      message: "",
      data: {
        usuario: {
          id: Number(u.id),
          correo: u.correo,
          nombre: u.nombre,
          rol: Number(u.rol),
          estado: "ACTIVO",
        },
      },
    };
  }
  const backends: [string, ReturnType<typeof createFakeRestBackend>][] = [
    ["/vehiculos", vehiculos],
    ["/celdas", celdas],
    ["/conductores", conductores],
    ["/parqueaderos", parqueaderos],
    ["/reservas", reservas],
  ];
  const match = backends.find(([prefix]) => path.startsWith(prefix));
  if (!match) throw new Error(`sin router para ${path}`);
  return match[1].apiFetch(path, opts as any);
});

async function reservaSample() {
  return {
    tipoReserva: "visitante" as const,
    vehiculoId: "1",
    celdaId: "1",
    conductorId: "1",
    motivo: "",
    motivoRechazo: "",
    fechaReserva: "2030-01-01",
    horaInicio: "08:00",
    horaFin: "10:00",
    estado: "pendiente" as const,
  };
}

function renderReservas(client = createTestQueryClient()) {
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <AuthProvider>
          <Reservas />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe("features/reservas", () => {
  beforeEach(() => {
    localStorage.setItem("parkuToken", "fake-token");
    localStorage.setItem(
      "parkUUser",
      JSON.stringify(sesionUsuario(ROLES.ADMIN)),
    );
  });

  afterEach(() => {
    localStorage.clear();
    vehiculos.reset();
    celdas.reset();
    conductores.reset();
    parqueaderos.reset();
    reservas.reset();
  });

  it("muestra el estado vacío cuando no hay reservas", async () => {
    renderReservas();
    await waitFor(() =>
      expect(
        screen.getByText("No se encontraron reservas"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Gestión de Reservas")).toBeInTheDocument();
  });

  it("crea una reserva y la muestra en la tabla con su estado", async () => {
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());

    renderReservas();

    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Pendiente").length).toBeGreaterThan(0);
  });

  it("filtra la lista al escribir una placa que no coincide con ninguna reserva", async () => {
    const user = userEvent.setup();
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());

    renderReservas();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    const search = screen.getByLabelText("Buscar reserva");
    await user.type(search, "ZZZ999");

    await waitFor(() =>
      expect(
        screen.getByText("No se encontraron reservas"),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Solicitudes de reserva pendientes (1)"),
    ).toBeInTheDocument();
  });

  it("abre el modal de detalle con la información de la reserva creada", async () => {
    const user = userEvent.setup();
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());

    renderReservas();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByLabelText("Ver detalle de la reserva"));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "ABC123" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Celda C-001")).toBeInTheDocument();
    expect(within(dialog).getByText("08:00 – 10:00")).toBeInTheDocument();
    expect(within(dialog).getByText("Aprendiz")).toBeInTheDocument();
    expect(within(dialog).getByText("Tipo de usuario")).toBeInTheDocument();
  });

  it("elimina la reserva mediante el modal de confirmación", async () => {
    const user = userEvent.setup();
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());

    renderReservas();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByLabelText("Eliminar reserva"));
    expect(await screen.findByText("¿Eliminar reserva?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(
        screen.getByText("No se encontraron reservas"),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
  });

  it("no muestra el botón de eliminar para una reserva ya rechazada, aunque el rol sí pueda eliminar (se conserva el historial de auditoría)", async () => {
    const reservasService = await import("@/services/api/reservas");
    const creada = await reservasService.create(await reservaSample());
    await reservasService.update(creada.id, {
      estado: "rechazada",
      motivoRechazo: "Sin disponibilidad en ese horario.",
    });

    renderReservas();

    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
    expect(screen.queryByLabelText("Eliminar reserva")).not.toBeInTheDocument();
    // El resto de la fila sigue disponible — solo se oculta la acción de eliminar.
    expect(
      screen.getByLabelText("Ver detalle de la reserva"),
    ).toBeInTheDocument();

    // Este archivo acumula estado entre tests (ver el backend a nivel de módulo más arriba) —
    // se elimina directo por el servicio (no por el botón, que este test ya probó que está
    // oculto) para no interferir con los tests que siguen.
    await reservasService.remove(creada.id);
  });

  it("no muestra el botón de eliminar para un Vigilante (el backend ya se lo rechaza con 403)", async () => {
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());

    localStorage.setItem(
      "parkUUser",
      JSON.stringify(sesionUsuario(ROLES.VIGILANTE)),
    );
    renderReservas();

    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    expect(screen.queryByLabelText("Eliminar reserva")).not.toBeInTheDocument();
    // El resto de la fila sigue disponible — solo se oculta la acción de eliminar.
    expect(
      screen.getByLabelText("Ver detalle de la reserva"),
    ).toBeInTheDocument();
  });

  it("muestra la información del solicitante al aprobar una reserva pendiente sin abrir un desplegable", async () => {
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());

    renderReservas();

    await waitFor(() =>
      expect(
        screen.getByText("Solicitudes de reserva pendientes (1)"),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Conductor Uno")).toBeInTheDocument();
    expect(screen.getByText("conductor1@sena.edu.co")).toBeInTheDocument();
    expect(screen.getByText("3201234567")).toBeInTheDocument();
  });

  it("avisa por correo cuando una reserva se acepta", async () => {
    const user = userEvent.setup();
    const reservasService = await import("@/services/api/reservas");
    await reservasService.create(await reservaSample());
    vi.mocked(toast.success).mockClear();

    renderReservas();

    await waitFor(() =>
      expect(
        screen.getByText("Solicitudes de reserva pendientes (1)"),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "Aceptar" }));
    await user.click(screen.getByRole("button", { name: "Aceptar solicitud" }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("La información llegará al correo"),
      ),
    );
  });
});
