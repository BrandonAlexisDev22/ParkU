import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppBackends } from "@/test/appFakeApi";
import { ControlSalidaPage } from "./ControlSalidaPage";
import { createTestQueryClient } from "@/test/queryWrapper";
import { AuthProvider } from "@/context/AuthContext";

const apiFetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/services/core/http", () => ({
  apiFetch: apiFetchMock,
  AUTH_EXPIRED_EVENT: "parku:auth-expired",
}));
apiFetchMock.mockImplementation(createAppBackends().apiFetch);

function renderControlSalida(client = createTestQueryClient()) {
  // Con sesión: la pantalla deja el reporte a nombre de quien la está usando.
  localStorage.setItem("parkuToken", "fake-token-1");
  localStorage.setItem(
    "parkUUser",
    JSON.stringify({
      id: "1",
      correo: "admin@sena.edu.co",
      nombre: "Administrador ParkU",
      numero: "3101234567",
      rol: 1,
    }),
  );
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ControlSalidaPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

function renderControlSalidaConductor(client = createTestQueryClient()) {
  localStorage.setItem("parkuToken", "fake-token-2");
  localStorage.setItem(
    "parkUUser",
    JSON.stringify({
      id: "2",
      correo: "ana.martinez@sena.edu.co",
      nombre: "Ana Martínez R.",
      numero: "",
      rol: 3,
    }),
  );
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ControlSalidaPage />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("features/controlSalida", () => {
  it("renderiza la página con datos reales (banner, toolbar y el registro semilla)", async () => {
    renderControlSalida();

    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );
    expect(screen.getByText("Entrada y Salida")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar registros")).toBeInTheDocument();
  });

  it("solo muestra los movimientos de los vehículos del conductor logueado", async () => {
    renderControlSalidaConductor();

    await waitFor(() => expect(screen.getByText("ABC123")).toBeInTheDocument());
    expect(screen.queryByText("DEF456")).not.toBeInTheDocument();
    expect(screen.getByText("Entrada y Salida")).toBeInTheDocument();
  });

  it("no muestra columnas ni acciones administrativas para el conductor", async () => {
    renderControlSalidaConductor();

    await waitFor(() => expect(screen.getByText("ABC123")).toBeInTheDocument());
    expect(screen.queryByText("Conductor")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Registrar salida y liberar la celda"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Reportar incidente o novedad/),
    ).not.toBeInTheDocument();
  });

  it("filtra la lista al escribir una placa en el buscador (vehículo real ABC123)", async () => {
    const user = userEvent.setup();
    renderControlSalida();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    const search = screen.getByLabelText("Buscar registros");
    await user.type(search, "ZZZ999");

    await waitFor(() =>
      expect(
        screen.getByText("No se encontraron registros"),
      ).toBeInTheDocument(),
    );
  });

  /* Un movimiento registrado es historia del parqueadero: no se borra. En su lugar se
     consulta la ficha completa, que es lo que la fila no alcanza a mostrar. */
  it("ya no ofrece eliminar un registro", async () => {
    renderControlSalida();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    expect(
      screen.queryByLabelText(/Eliminar registro/),
    ).not.toBeInTheDocument();
  });

  it("abre el detalle del movimiento con lo que no cabe en la fila", async () => {
    const user = userEvent.setup();
    renderControlSalida();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByLabelText(/Ver detalle del movimiento/));

    expect(
      await screen.findByText("Detalle del movimiento"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Estadía").length).toBeGreaterThan(1);
  });

  it('registra la salida y libera la celda desde el botón "Registrar salida" de la fila', async () => {
    // Antes esta acción solo existía en el mapa/tabla de Parqueaderos — se agregó también acá
    // porque es exactamente la pantalla donde alguien buscaría "registrar salida" por su nombre.
    const user = userEvent.setup();
    renderControlSalida();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    expect(screen.getByText("Activo")).toBeInTheDocument();
    await user.click(
      screen.getByLabelText("Registrar salida y liberar la celda"),
    );

    await waitFor(() =>
      expect(screen.getByText("Completado")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Activo")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Registrar salida y liberar la celda"),
    ).not.toBeInTheDocument();
  });

  /* Reportar desde aquí ahorra volver a buscar lo que la pantalla ya tiene delante: la celda,
     el parqueadero y el vehículo del movimiento. */
  it("abre el reporte de incidente con el contexto del movimiento", async () => {
    const user = userEvent.setup();
    renderControlSalida();
    await waitFor(() =>
      expect(screen.getAllByText("ABC123").length).toBeGreaterThan(0),
    );

    await user.click(screen.getByLabelText(/Reportar incidente o novedad/));

    expect(
      await screen.findByLabelText("¿Qué vas a reportar? *"),
    ).toBeInTheDocument();
    // Con una sola cuenta posible el campo queda fijo con su nombre a la vista: solo un
    // administrador puede dejar el reporte a nombre de otra persona.
    expect(screen.getByText("Administrador ParkU")).toBeInTheDocument();
    // El tipo arranca sin elegir: es obligatorio, y un valor por defecto sería una elección
    // que nadie hizo.
    expect(screen.getByLabelText("Tipo *")).toHaveValue("");
  });
});
