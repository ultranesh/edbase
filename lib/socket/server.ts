import { Server } from 'socket.io';
import { createServer } from 'http';

const PORT = parseInt(process.env.SOCKET_PORT || '3003');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://classroom.ertis.academy',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Connection handling
io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Join CRM room for real-time updates
  socket.on('join:crm', () => {
    socket.join('crm');
    console.log(`[Socket.io] ${socket.id} joined CRM room`);
  });

  // Join specific lead room for chat updates
  socket.on('join:lead', (leadId: string) => {
    socket.join(`lead:${leadId}`);
    console.log(`[Socket.io] ${socket.id} joined lead:${leadId}`);
  });

  socket.on('leave:lead', (leadId: string) => {
    socket.leave(`lead:${leadId}`);
  });

  // Rebroadcast events to rooms
  socket.on('crm:new-lead', (data) => {
    io.to('crm').emit('crm:new-lead', data);
    console.log(`[Socket.io] Broadcasted new lead to CRM room:`, data.id);
  });

  socket.on('crm:new-message', (data) => {
    io.to('crm').emit('crm:new-message', data);
    console.log(`[Socket.io] Broadcasted new message to CRM room for lead:`, data.leadId);
  });

  socket.on('crm:lead-updated', (data) => {
    io.to('crm').emit('crm:lead-updated', data);
    console.log(`[Socket.io] Broadcasted lead update to CRM room:`, data.id);
  });

  socket.on('lead:new-message', (data) => {
    io.to(`lead:${data.leadId}`).emit('lead:new-message', data);
    console.log(`[Socket.io] Broadcasted message to lead room:`, data.leadId);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Socket.io] Server running on port ${PORT}`);
});

export { io };
