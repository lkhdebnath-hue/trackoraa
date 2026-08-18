import mongoose from 'mongoose';
import { connectDB } from './src/config/db';
import { Task } from './src/models/Task';
import { User } from './src/models/User'; // Import to register schema

async function test() {
  await connectDB();
  const tasks = await Task.find({}).populate('comments.user', 'username role');
  console.log(JSON.stringify(tasks.map(t => t.comments), null, 2));
  process.exit(0);
}
test();
