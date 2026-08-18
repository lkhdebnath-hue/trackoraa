export const redisClient = { on: () => {} } as any;

export const connectRedis = async (): Promise<void> => {
  console.log('Redis mocked. Skipping connection.');
};
