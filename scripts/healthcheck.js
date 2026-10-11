const port = process.env.PORT || 3000;

fetch(`http://127.0.0.1:${port}/health`, {
  signal: AbortSignal.timeout(3000)
})
  .then((response) => {
    process.exit(response.ok ? 0 : 1);
  })
  .catch(() => {
    process.exit(1);
  });