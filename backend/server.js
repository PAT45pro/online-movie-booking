const app = require('./src/app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬 Cinema Booking API đang chạy tại http://localhost:${PORT}`);
});
