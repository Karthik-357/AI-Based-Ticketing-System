import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { addComment, getComments } from '../controllers/comment.js';

const router = express.Router();

router.post('/:ticketId', authenticate, addComment);
router.get('/:ticketId', authenticate, getComments);

export default router;
