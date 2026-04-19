const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = 'ar_metro_secret_2025';

app.use(cors());
app.use(express.json());

// ==================== MongoDB 连接配置 ====================
// 使用本地 MongoDB（请确保 MongoDB 服务已启动）
const MONGODB_URI = "mongodb://sxc:sxc123456@ac-kv5auwd-shard-00-00.nftqnjl.mongodb.net:27017,ac-kv5auwd-shard-00-01.nftqnjl.mongodb.net:27017,ac-kv5auwd-shard-00-02.nftqnjl.mongodb.net:27017/?ssl=true&replicaSet=atlas-pl1b9d-shard-0&authSource=admin&appName=Cluster0";

// ==================== 定义 Mongoose 模型 ====================

// 用户模型
const userSchema = new mongoose.Schema({
  id: { type: Number, unique: true },          // 自定义数字ID
  username: { type: String, required: true, unique: true },
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  nickname: String,
  totalPoints: { type: Number, default: 0 },
  remainingPoints: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// 成就模型（静态数据）
const achievementSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  nameZh: String,
  nameEn: String,
  conditionType: String,
  conditionValue: Number,
  pointsReward: Number,
  icon: String
});
const Achievement = mongoose.model('Achievement', achievementSchema);

// 用户成就解锁记录
const userAchievementSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  achievementId: { type: Number, required: true },
  unlockedAt: { type: Date, default: Date.now }
});
const UserAchievement = mongoose.model('UserAchievement', userAchievementSchema);

// 任务模型（静态数据）
const missionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  type: String,
  nameZh: String,
  nameEn: String,
  pointsReward: Number,
  daily: Boolean
});
const Mission = mongoose.model('Mission', missionSchema);

// 用户任务完成记录
const userMissionSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  missionId: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
});
const UserMission = mongoose.model('UserMission', userMissionSchema);

// 出行记录模型
const tripSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  startStation: String,
  endStation: String,
  line: String,
  carbonSaved: Number,
  pointsEarned: Number,
  startTime: { type: Date, default: Date.now }
});
const Trip = mongoose.model('Trip', tripSchema);

// 优惠券模型（静态数据）
const couponSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  nameZh: String,
  nameEn: String,
  type: String,
  minSpend: Number,
  discountAmount: Number,
  pointsCost: Number
});
const Coupon = mongoose.model('Coupon', couponSchema);

// 用户优惠券记录
const userCouponSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  couponId: { type: Number, required: true },
  obtainedAt: { type: Date, default: Date.now },
  usedAt: Date
});
const UserCoupon = mongoose.model('UserCoupon', userCouponSchema);

// ==================== 初始化默认数据 ====================
async function initializeDefaultData() {
  // 初始化成就
  const achievements = [
    { id: 1, nameZh: '初学者', nameEn: 'Beginner', conditionType: 'trips', conditionValue: 1, pointsReward: 0, icon: 'fa-star' },
    { id: 2, nameZh: '探索家', nameEn: 'Explorer', conditionType: 'trips', conditionValue: 10, pointsReward: 0, icon: 'fa-map-marked-alt' },
    { id: 3, nameZh: '地铁达人', nameEn: 'Metro Master', conditionType: 'trips', conditionValue: 100, pointsReward: 0, icon: 'fa-subway' },
    { id: 4, nameZh: '环保卫士', nameEn: 'Eco Warrior', conditionType: 'carbon', conditionValue: 10, pointsReward: 0, icon: 'fa-leaf' },
    { id: 5, nameZh: '环保英雄', nameEn: 'Eco Hero', conditionType: 'carbon', conditionValue: 50, pointsReward: 0, icon: 'fa-tree' },
    { id: 6, nameZh: '积分富翁', nameEn: 'Points Rich', conditionType: 'points', conditionValue: 1000, pointsReward: 0, icon: 'fa-coins' },
    { id: 7, nameZh: '积分土豪', nameEn: 'Points Tycoon', conditionType: 'points', conditionValue: 5000, pointsReward: 0, icon: 'fa-gem' },
    { id: 8, nameZh: 'AR先锋', nameEn: 'AR Pioneer', conditionType: 'arUsage', conditionValue: 5, pointsReward: 0, icon: 'fa-vr-cardboard' }
  ];
  for (const ach of achievements) {
    await Achievement.updateOne({ id: ach.id }, ach, { upsert: true });
  }

  // 初始化任务
  const missions = [
    { id: 1, type: 'signIn', nameZh: '每日签到', nameEn: 'Daily Sign-in', pointsReward: 20, daily: true },
    { id: 2, type: 'metroTrip', nameZh: '地铁出行', nameEn: 'Metro Trip', pointsReward: 50, daily: true },
    { id: 3, type: 'arNav', nameZh: 'AR导航', nameEn: 'AR Navigation', pointsReward: 20, daily: true }
  ];
  for (const mis of missions) {
    await Mission.updateOne({ id: mis.id }, mis, { upsert: true });
  }

  // 初始化优惠券
  const coupons = [
    { id: 1, nameZh: '满5减2券', nameEn: '¥2 off (min ¥5)', type: 'min5_2', minSpend: 5, discountAmount: 2, pointsCost: 100 },
    { id: 2, nameZh: '满10减5券', nameEn: '¥5 off (min ¥10)', type: 'min10_5', minSpend: 10, discountAmount: 5, pointsCost: 300 },
    { id: 3, nameZh: '满12减7券', nameEn: '¥7 off (min ¥12)', type: 'min12_7', minSpend: 12, discountAmount: 7, pointsCost: 500 }
  ];
  for (const coup of coupons) {
    await Coupon.updateOne({ id: coup.id }, coup, { upsert: true });
  }

  // 初始化测试账号（如果不存在）
  const testUserExists = await User.findOne({ username: '洋葱柠檬水' });
  if (!testUserExists) {
    const hashedPassword = bcrypt.hashSync('123456', 10);
    const maxUser = await User.findOne().sort('-id');
    const newId = maxUser ? maxUser.id + 1 : 1;
    const newUser = new User({
      id: newId,
      username: '洋葱柠檬水',
      phone: '1145140721',
      password: hashedPassword,
      nickname: '洋葱柠檬水',
      totalPoints: 2580,
      remainingPoints: 2580,
      level: 12
    });
    await newUser.save();
  }

  console.log("默认数据初始化完成");
}

// ==================== 辅助函数 ====================
async function addPoints(userId, amount, reason) {
  const user = await User.findOne({ id: userId });
  if (!user) return false;
  user.totalPoints += amount;
  user.remainingPoints += amount;
  let newLevel = Math.floor(user.totalPoints / 100) + 1;
  if (newLevel > 20) newLevel = 20;
  user.level = newLevel;
  await user.save();
  await checkAchievements(userId);
  return true;
}

async function checkAchievements(userId) {
  const user = await User.findOne({ id: userId });
  if (!user) return;
  const tripsCount = await Trip.countDocuments({ userId });
  const totalCarbonAgg = await Trip.aggregate([
    { $match: { userId } },
    { $group: { _id: null, sum: { $sum: "$carbonSaved" } } }
  ]);
  const totalCarbon = totalCarbonAgg.length ? totalCarbonAgg[0].sum : 0;
  const arUsageCount = await UserMission.countDocuments({ userId, missionId: 3 });

  const allAchievements = await Achievement.find();
  const unlocked = await UserAchievement.find({ userId }).distinct('achievementId');
  for (const ach of allAchievements) {
    if (unlocked.includes(ach.id)) continue;
    let achieved = false;
    switch (ach.conditionType) {
      case 'trips': achieved = tripsCount >= ach.conditionValue; break;
      case 'carbon': achieved = totalCarbon >= ach.conditionValue; break;
      case 'points': achieved = user.totalPoints >= ach.conditionValue; break;
      case 'arUsage': achieved = arUsageCount >= ach.conditionValue; break;
    }
    if (achieved) {
      await UserAchievement.create({ userId, achievementId: ach.id });
      if (ach.pointsReward > 0) await addPoints(userId, ach.pointsReward, `解锁成就：${ach.nameZh}`);
    }
  }
}

async function completeMission(userId, missionId) {
  const mission = await Mission.findOne({ id: missionId });
  if (!mission) return false;
  const today = new Date().toISOString().split('T')[0];
  const already = await UserMission.findOne({
    userId,
    missionId,
    completedAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') }
  });
  if (already) return false;
  await UserMission.create({ userId, missionId });
  await addPoints(userId, mission.pointsReward, `完成任务：${mission.nameZh}`);
  return true;
}

// ==================== API 路由 ====================
// 注册
app.post('/api/auth/register', async (req, res) => {
console.log("收到注册请求:", req.body);  
const { username, phone, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });
  const existing = await User.findOne({ $or: [{ username }, { phone }] });
  if (existing) return res.status(400).json({ error: '用户名或手机号已存在' });
 const hashed = bcrypt.hashSync(password, 10);
  const maxUser = await User.findOne().sort('-id');
  const newId = maxUser ? maxUser.id + 1 : 1;
  const newUser = new User({
    id: newId,
    username,
    phone: (phone && phone.trim() !== '') ? phone : null,
    password: hashed,
    nickname: username,
    totalPoints: 0,
    remainingPoints: 0,
    level: 1
  });
  await newUser.save();
console.log("新用户已保存:", newUser);
  const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, username, nickname: username, level: 1, totalPoints: 0, remainingPoints: 0 } });
});

// 登录
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ $or: [{ username }, { phone: username }] });
  if (!user) return res.status(401).json({ error: '用户不存在' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: '密码错误' });
  user.lastLogin = new Date();
  await user.save();
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, nickname: user.nickname, level: user.level, totalPoints: user.totalPoints, remainingPoints: user.remainingPoints } });
});

// 获取用户资料（需要 token）
app.get('/api/user/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ id: decoded.userId });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ id: user.id, username: user.username, nickname: user.nickname, level: user.level, totalPoints: user.totalPoints, remainingPoints: user.remainingPoints });
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// 获取成就列表及解锁状态
app.get('/api/user/achievements', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const achievements = await Achievement.find();
    const userAchievements = await UserAchievement.find({ userId }).distinct('achievementId');
    const result = achievements.map(ach => ({
      ...ach.toObject(),
      unlocked: userAchievements.includes(ach.id),
      unlockedAt: null
    }));
    res.json(result);
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// 获取今日任务状态
app.get('/api/user/missions', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const today = new Date().toISOString().split('T')[0];
    const missions = await Mission.find();
    const completedMissions = await UserMission.find({
      userId,
      completedAt: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59.999Z') }
    }).distinct('missionId');
    const result = missions.map(m => ({
      ...m.toObject(),
      completed: completedMissions.includes(m.id)
    }));
    res.json(result);
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// 完成任务
app.post('/api/user/missions/:id/complete', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const missionId = parseInt(req.params.id);
    const success = await completeMission(userId, missionId);
    if (success) res.json({ success: true });
    else res.status(400).json({ error: '任务已完成或不存在' });
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// 记录出行
app.post('/api/trip/record', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { startStation, endStation, line, carbonSaved, pointsEarned, startTime } = req.body;
    const trip = new Trip({
      userId,
      startStation,
      endStation,
      line,
      carbonSaved,
      pointsEarned,
      startTime: startTime || new Date()
    });
    await trip.save();
    await addPoints(userId, pointsEarned, `地铁出行：${startStation} → ${endStation}`);
    await completeMission(userId, 2); // 完成地铁出行每日任务
    res.json(trip);
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// 获取出行记录
app.get('/api/trip/history', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const trips = await Trip.find({ userId }).sort({ startTime: -1 });
    res.json(trips);
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// 获取优惠券列表
app.get('/api/mall/coupons', async (req, res) => {
  const coupons = await Coupon.find();
  res.json(coupons);
});

// 兑换优惠券
app.post('/api/mall/exchange', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: '未授权' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    const { couponId } = req.body;
    const coupon = await Coupon.findOne({ id: couponId });
    if (!coupon) return res.status(404).json({ error: '优惠券不存在' });
    const user = await User.findOne({ id: userId });
    if (user.remainingPoints < coupon.pointsCost) return res.status(400).json({ error: '积分不足' });
    user.remainingPoints -= coupon.pointsCost;
    await user.save();
    await UserCoupon.create({ userId, couponId, obtainedAt: new Date() });
    res.json({ success: true });
  } catch (err) {
    return res.status(401).json({ error: '无效token' });
  }
});

// ==================== 连接数据库并启动服务器 ====================
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("成功连接到 MongoDB");
    await initializeDefaultData();
    app.listen(PORT, () => {
      console.log(`后端服务已启动：http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB 连接失败:", err);
    process.exit(1);
  });
