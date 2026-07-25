export const getAPIEndpoints = (req, res) =>
  res.status(200).json({
    status: "success",
    data: {
      name: "Task API",
      version: "1.0",
      endpoints: ["/tasks", "/health", "/docs"],
    },
  });

export const getServerHealth = (req, res) =>
  res.status(200).json({
    status: "success",
    message: "Server is up and running.",
  });
