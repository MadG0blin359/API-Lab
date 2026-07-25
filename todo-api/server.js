import createApp from "./src/app.js";

const app = createApp();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}...`,
  );
  console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
});
