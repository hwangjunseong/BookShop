const redis = require("redis");
const redisUrl = "redis://127.0.0.1:6379";
const redisClient = redis.createClient(redisUrl);
// 클라이언트 연결
redisClient
  .connect()
  .then(async () => {
    console.log("Connected to Redis successfully!");

    // 'hi' 키에 'there' 값 설정
    await redisClient.set("hi", "there");
    console.log("Value set successfully");

    // 'hi' 키의 값 가져오기
    let value = await redisClient.get("hi");
    console.log("Retrieved value:", value);

    // await redisClient.set("colors", { red: "rojo" });
    // value = await redisClient.get("colors");
    // console.log("nested:", value);

    await redisClient.set("colors", JSON.stringify({ red: "rojo" }));
    value = await redisClient.get("colors");
    console.log("nested value:", value);
    value = await redisClient.get("colors");
    console.log("json nested value:", JSON.parse(value));

    // 클라이언트 종료
    await redisClient.quit();
    console.log("Redis client connection closed.");
  })
  .catch((err) => {
    console.error("Redis connection failed:", err);
  });
