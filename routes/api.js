'use strict';
const { MongoClient, ObjectId } = require('mongodb'); // <-- Ensure ObjectId is here

module.exports = function (app) {
  const client = new MongoClient(process.env.DB);
  
  client.connect()
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB error:', err));

  const db = client.db('messageboard');

  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;
      
      const thread = {
        text,
        delete_password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      };

      try {
        const result = await db.collection(board).insertOne(thread);
        res.json(thread); // <-- Return the thread object directly
      } catch (err) {
        res.status(500).send('Error creating thread');
      }
    })
    .get(async (req, res) => {
      const board = req.params.board;
      try {
        const threads = await db.collection(board)
          .find({})
          .sort({ bumped_on: -1 })
          .limit(10)
          .toArray();

        const formatted = threads.map(t => {
          delete t.delete_password;
          delete t.reported;
          t.replies = t.replies.slice(-3).map(r => {
            delete r.delete_password;
            delete r.reported;
            return r;
          });
          return t;
        });
        res.json(formatted);
      } catch (err) {
        res.status(500).send('Error fetching threads');
      }
    })
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      const board = req.params.board;
      try {
        const thread = await db.collection(board).findOne({ _id: new ObjectId(thread_id) });
        if (!thread) return res.send('incorrect password');
        
        if (thread.delete_password === delete_password) {
          await db.collection(board).deleteOne({ _id: new ObjectId(thread_id) });
          res.send('success');
        } else {
          res.send('incorrect password');
        }
      } catch (err) {
        res.send('incorrect password');
      }
    })
    .put(async (req, res) => {
      const { thread_id } = req.body;
      const board = req.params.board;
      try {
        await db.collection(board).updateOne(
          { _id: new ObjectId(thread_id) },
          { $set: { reported: true } }
        );
        res.send('reported');
      } catch (err) {
        res.status(500).send('Error reporting');
      }
    });

  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { text, delete_password, thread_id } = req.body;
      const board = req.params.board;
      
      const reply = {
        _id: new ObjectId(),
        text,
        delete_password,
        created_on: new Date(),
        reported: false
      };

      try {
        await db.collection(board).updateOne(
          { _id: new ObjectId(thread_id) },
          { 
            $push: { replies: reply },
            $set: { bumped_on: new Date() }
          }
        );
        res.json(reply);
      } catch (err) {
        res.status(500).send('Error creating reply');
      }
    })
    .get(async (req, res) => {
      const board = req.params.board;
      const { thread_id } = req.query;
      try {
        const thread = await db.collection(board).findOne({ _id: new ObjectId(thread_id) });
        if (!thread) return res.status(404).send('Thread not found');
        
        delete thread.delete_password;
        delete thread.reported;
        thread.replies = thread.replies.map(r => {
          delete r.delete_password;
          delete r.reported;
          return r;
        });
        res.json(thread);
      } catch (err) {
        res.status(500).send('Error fetching replies');
      }
    })
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      const board = req.params.board;
      try {
        const thread = await db.collection(board).findOne({ _id: new ObjectId(thread_id) });
        if (!thread) return res.send('incorrect password');
        
        const reply = thread.replies.find(r => r._id.toString() === reply_id);
        if (!reply) return res.send('incorrect password');
        
        if (reply.delete_password === delete_password) {
          await db.collection(board).updateOne(
            { _id: new ObjectId(thread_id), "replies._id": new ObjectId(reply_id) },
            { $set: { "replies.$.text": "[deleted]" } }
          );
          res.send('success');
        } else {
          res.send('incorrect password');
        }
      } catch (err) {
        res.send('incorrect password');
      }
    })
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      const board = req.params.board;
      try {
        await db.collection(board).updateOne(
          { _id: new ObjectId(thread_id), "replies._id": new ObjectId(reply_id) },
          { $set: { "replies.$.reported": true } }
        );
        res.send('reported');
      } catch (err) {
        res.status(500).send('Error reporting');
      }
    });
};