const redis = require("redis");
const redisUrl = "redis://127.0.0.1:6379";
// const redisClient = redis.createClient(process.env.REDIS_PORT);
const redisClient = redis.createClient(redisUrl);
// Redis 연결
redisClient
  .connect()
  .then(() => console.log("redis 연결 성공"))
  .catch(console.error);
const set = async (key, value) => {
  if (typeof key !== "string") {
    key = String(key); // key가 문자열이 아니면 문자열로 변환
  }
  try {
    await redisClient.set(key, value);
    // console.log(`Value set for key: ${key}`);
  } catch (err) {
    console.error("Error setting value in Redis:", err);
  }
};

const get = async (key) => {
  // console.log(`getKey: ${key}`);
  try {
    const data = await redisClient.get(key); // 비동기 방식으로 데이터 가져오기
    // console.log("redisgetdata", data);
    if (data !== null) {
      // console.log("Data from Redis cache!");
      return data;
    }
  } catch (error) {
    console.error("Error getting value from Redis:", error);
    return null;
  }
};

module.exports = {
  redisClient,
  set,
  get,
};
