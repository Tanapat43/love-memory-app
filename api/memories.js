const { MongoClient, ObjectId } = require('mongodb');

const DB_NAME = 'love_memory_db';
const COLLECTION_NAME = 'memories';

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not set');
  }
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
  await client.connect();
  const db = client.db(DB_NAME);
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

async function handleGet(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const memories = await collection.find({}).sort({ date: -1, createdAt: -1 }).toArray();
    const formattedMemories = memories.map((m) => ({ ...m, _id: m._id.toString() }));
    return res.status(200).json({ success: true, count: formattedMemories.length, data: formattedMemories });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Fetch error', error: error.message });
  }
}

async function handlePost(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const { image, text, date, title } = req.body;
    if (!image && !text) {
      return res.status(400).json({ success: false, message: 'image or text required' });
    }
    const newMemory = {
      image: image || '',
      text: text || '',
      title: title || '',
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await collection.insertOne(newMemory);
    if (!result.acknowledged) throw new Error('Insert failed');
    return res.status(201).json({ success: true, message: 'Created', data: { _id: result.insertedId.toString(), ...newMemory } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Create error', error: error.message });
  }
}

async function handlePut(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const { id } = req.query;
    const { image, text, date, title } = req.body;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const updateData = { updatedAt: new Date() };
    if (image !== undefined) updateData.image = image;
    if (text !== undefined) updateData.text = text;
    if (date !== undefined) updateData.date = date;
    if (title !== undefined) updateData.title = title;
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: updateData });
    if (result.matchedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, message: 'Updated', data: { _id: id, ...updateData } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Update error', error: error.message });
  }
}

async function handleDelete(req, res) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'id required' });
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Delete error', error: error.message });
  }
}

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  switch (req.method) {
    case 'GET': return handleGet(req, res);
    case 'POST': return handlePost(req, res);
    case 'PUT': return handlePut(req, res);
    case 'DELETE': return handleDelete(req, res);
    default: return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
};