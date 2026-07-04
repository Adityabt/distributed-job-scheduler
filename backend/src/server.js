const app = require('./app');
const { startWorker } = require('./workers/jobWorker');
const { startPoller } = require('./workers/scheduledPoller');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  startWorker();
  startPoller();
});