const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { upload } = require('../config/upload');

exports.uploadProfilePic = [
  upload.single('profilePic'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const userId = req.user.user_id;
      const fileUrl = `/uploads/${req.file.filename}`;

      await prisma.user.update({ where: { user_id: userId }, data: { profile_pic: fileUrl } });
      res.status(200).json({ message: 'Profile picture uploaded successfully', profile_pic: fileUrl });
    } catch (error) {
      res.status(500).json({ error: 'Error uploading profile picture' });
    }
  }
];

exports.uploadGroupImage = [
  upload.fields([{ name: 'chat_image', maxCount: 1 }, { name: 'groupImage', maxCount: 1 }]),
  async (req, res) => {
    try {
      const file = req.files?.chat_image?.[0] || req.files?.groupImage?.[0];
      if (!file) return res.status(400).json({ error: 'No file uploaded. Use field name: chat_image or groupImage' });

      const { chatId } = req.body;
      if (!chatId) return res.status(400).json({ error: 'chatId is required in request body' });

      const chat = await prisma.chat.findUnique({ where: { chat_id: parseInt(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      if (chat.chat_type !== 'group') return res.status(400).json({ error: 'Group image can only be set for group chats' });

      const adminRecord = await prisma.groupAdmin.findUnique({
        where: { chat_id_user_id: { chat_id: parseInt(chatId), user_id: req.user.user_id } }
      });
      if (!adminRecord) return res.status(403).json({ error: 'Only group admins can upload the group image' });

      const fileUrl = `/uploads/${file.filename}`;
      await prisma.chat.update({ where: { chat_id: parseInt(chatId) }, data: { chat_image: fileUrl } });
      res.status(200).json({ message: 'Group image uploaded successfully', chat_image: fileUrl });
    } catch (error) {
      res.status(500).json({ error: 'Error uploading group image' });
    }
  }
];

exports.uploadAttachment = [
  upload.single('attachment'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      res.status(200).json({
        message: 'Attachment uploaded successfully',
        file_url: `/uploads/${req.file.filename}`,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        filename: req.file.filename
      });
    } catch (error) {
      res.status(500).json({ error: 'Error uploading attachment' });
    }
  }
];

exports.getChatImage = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const chat = await prisma.chat.findFirst({
      where: { OR: [{ chat_image: `/uploads/${filename}` }, { chat_image: `uploads/${filename}` }, { chat_image: filename }] },
      include: { members: { where: { user_id: req.user.user_id } } }
    });

    if (!chat) return res.status(404).json({ error: 'Chat image not found' });
    if (chat.members.length === 0) return res.status(403).json({ error: 'Access denied. You are not a member of this chat.' });

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getAttachment = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const attachment = await prisma.attachment.findFirst({
      where: { OR: [{ file_url: `/uploads/${filename}` }, { file_url: `uploads/${filename}` }, { file_url: filename }] },
      include: { message: { include: { chat: { include: { members: { where: { user_id: req.user.user_id } } } } } } }
    });

    if (!attachment) return res.status(404).json({ error: 'File not found in any accessible conversation' });
    if (attachment.message.chat.members.length === 0) return res.status(403).json({ error: 'Access denied. You are not a member of this conversation.' });

    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getProfilePicture = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Profile picture not found' });

    const user = await prisma.user.findFirst({
      where: { OR: [{ profile_pic: `/uploads/${filename}` }, { profile_pic: `uploads/${filename}` }, { profile_pic: filename }] }
    });

    if (!user) return res.status(404).json({ error: 'Profile picture not found' });
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Error serving file' });
  }
};

exports.getFile = async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../../uploads', filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const userWithProfilePic = await prisma.user.findFirst({
      where: { OR: [{ profile_pic: `/uploads/${filename}` }, { profile_pic: `uploads/${filename}` }, { profile_pic: filename }] }
    });
    if (userWithProfilePic) return res.sendFile(filePath);

    const chatWithImage = await prisma.chat.findFirst({
      where: { OR: [{ chat_image: `/uploads/${filename}` }, { chat_image: `uploads/${filename}` }, { chat_image: filename }] }
    });
    if (chatWithImage) return res.sendFile(filePath);

    const attachment = await prisma.attachment.findFirst({
      where: { OR: [{ file_url: `/uploads/${filename}` }, { file_url: `uploads/${filename}` }, { file_url: filename }] },
      include: { message: { include: { chat: { include: { members: { where: { user_id: req.user.user_id } } } } } } }
    });
    if (attachment && attachment.message.chat.members.length > 0) return res.sendFile(filePath);

    return res.status(404).json({ error: 'File not found' });
  } catch (error) {
    res.status(500).json({ error: 'Error serving file' });
  }
};
