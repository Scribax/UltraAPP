// PM2 Ecosystem — Configuración de producción
// Uso: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: 'miapp-api',
      script: 'src/app.js',
      cwd: '/app/backend',

      // Cluster mode: usa todos los CPUs disponibles (2 vCPU → 2 instancias)
      instances: 'max',
      exec_mode: 'cluster',

      // Auto-reinicio
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',

      // Logs
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Entornos
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
};
