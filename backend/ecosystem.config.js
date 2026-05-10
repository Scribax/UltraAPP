module.exports = {
  apps: [{
    name: 'miapp_api',
    script: 'src/app.js',
    instances: 'max', // Utilizar todos los núcleos disponibles del CPU (Cluster Mode)
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G', // Reiniciar el proceso si consume demasiada RAM
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
