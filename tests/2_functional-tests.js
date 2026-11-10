'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server.js');

chai.use(chaiHttp);

let testThreadId;
let testReplyId;

describe('Functional Tests', function () {
  this.timeout(5000);

  it('Creating a new thread: POST request to /api/threads/{board}', function (done) {
    chai.request(server)
      .post('/api/threads/general')
      .send({ text: 'Test Thread', delete_password: 'pass123' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        testThreadId = res.body._id; // Save the ID for later tests
        done();
      });
  });

  it('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function (done) {
    chai.request(server)
      .get('/api/threads/general')
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        done();
      });
  });

  it('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function (done) {
    chai.request(server)
      .delete('/api/threads/general')
      .send({ thread_id: testThreadId, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  it('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function (done) {
    // Create a throwaway thread to delete it safely
    chai.request(server)
      .post('/api/threads/general')
      .send({ text: 'Delete Me', delete_password: 'pass123' })
      .end(function (err, res) {
        const tempId = res.body._id;
        chai.request(server)
          .delete('/api/threads/general')
          .send({ thread_id: tempId, delete_password: 'pass123' })
          .end(function (err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
  });

  it('Reporting a thread: PUT request to /api/threads/{board}', function (done) {
    chai.request(server)
      .put('/api/threads/general')
      .send({ thread_id: testThreadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });

  it('Creating a new reply: POST request to /api/replies/{board}', function (done) {
    chai.request(server)
      .post('/api/replies/general')
      .send({ text: 'Test Reply', delete_password: 'pass123', thread_id: testThreadId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        testReplyId = res.body._id; // Save the reply ID
        done();
      });
  });

  it('Viewing a single thread with all replies: GET request to /api/replies/{board}', function (done) {
    chai.request(server)
      .get(`/api/replies/general?thread_id=${testThreadId}`)
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body.replies);
        done();
      });
  });

  it('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function (done) {
    chai.request(server)
      .delete('/api/replies/general')
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'wrong' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  it('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function (done) {
    chai.request(server)
      .delete('/api/replies/general')
      .send({ thread_id: testThreadId, reply_id: testReplyId, delete_password: 'pass123' })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'success');
        done();
      });
  });

  it('Reporting a reply: PUT request to /api/replies/{board}', function (done) {
    chai.request(server)
      .put('/api/replies/general')
      .send({ thread_id: testThreadId, reply_id: testReplyId })
      .end(function (err, res) {
        assert.equal(res.status, 200);
        assert.equal(res.text, 'reported');
        done();
      });
  });
});