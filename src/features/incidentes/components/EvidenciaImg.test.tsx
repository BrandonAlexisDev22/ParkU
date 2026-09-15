import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EvidenciaImg } from "./EvidenciaImg";

describe("EvidenciaImg", () => {
  it("empieza por el origen del servidor y, si falla, reintenta bajo la base de la API", () => {
    const onCargada = vi.fn();
    const onFallo = vi.fn();
    render(<EvidenciaImg url="/uploads/evidencias/a.jpg" alt="Evidencia 1" onCargada={onCargada} onFallo={onFallo} />);

    const img = screen.getByAltText("Evidencia 1") as HTMLImageElement;
    // VITE_API_URL del .env es https://api-parku-e017.onrender.com/api: la primera URL va sin /api.
    expect(img.src).toBe("https://api-parku-e017.onrender.com/uploads/evidencias/a.jpg");

    fireEvent.error(img);
    expect(img.src).toBe("https://api-parku-e017.onrender.com/api/uploads/evidencias/a.jpg");
    expect(onFallo).not.toHaveBeenCalled();

    fireEvent.load(img);
    expect(onCargada).toHaveBeenCalledWith("https://api-parku-e017.onrender.com/api/uploads/evidencias/a.jpg");
  });

  it("avisa del fallo solo cuando se agotaron todas las URLs candidatas", () => {
    const onFallo = vi.fn();
    render(<EvidenciaImg url="uploads/b.png" alt="Evidencia 2" onFallo={onFallo} />);

    const img = screen.getByAltText("Evidencia 2");
    fireEvent.error(img);
    expect(onFallo).not.toHaveBeenCalled();
    fireEvent.error(img);
    expect(onFallo).toHaveBeenCalledTimes(1);
  });

  it("no renderiza nada sin URL", () => {
    const { container } = render(<EvidenciaImg url="" alt="Nada" />);
    expect(container.querySelector("img")).toBeNull();
  });
});
