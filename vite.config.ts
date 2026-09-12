import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // loadEnv lee el .env sin depender de process, que no existe en el tipado del navegador
  // (usarlo obligaría a agregar @types/node solo para esta línea).
  const env = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    server: {
      port: 5173,
      // Evita problemas de CORS en desarrollo: /api va al backend Django.
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
