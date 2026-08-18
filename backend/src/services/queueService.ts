export const notificationQueue = { add: async () => {} } as any;

export const addNotificationJob = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
) => {
  console.log('Mocked addNotificationJob called.');
};

export const initQueueWorker = () => {
  console.log('BullMQ mocked. Skipping worker initialization.');
};
export default notificationQueue;
