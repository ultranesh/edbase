module.exports = {
  apps: [
    {
      name: 'ertis-classroom',
      script: 'npm',
      args: 'start -- -p 3001',
      cwd: '/var/www/ertis-classroom',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'classroom-socket',
      script: 'npx',
      args: 'tsx lib/socket/server.ts',
      cwd: '/var/www/ertis-classroom',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 3003,
      },
    },
  ],
};
