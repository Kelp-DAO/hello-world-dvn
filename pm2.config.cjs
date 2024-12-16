module.exports = {
  apps: [
    {
      name: "anvil",
      script: "anvil",
      args: "-f https://data-seed-prebsc-1-s1.binance.org:8545/",
      cwd: ".",
      interpreter: "none",
    },
    {
      name: "task-aggregator",
      script: "npm",
      args: "run task-aggregator",
      cwd: ".",
      interpreter: "none",
    },
    {
      name: "task-generator",
      script: "npm",
      args: "run task-generator",
      cwd: ".",
      interpreter: "none",
    },
    {
      name: "operator-lre",
      script: "npm",
      args: "run operator-lre",
      cwd: ".",
      interpreter: "none",
      instances: process.env.INSTANCES || 5,
      exec_mode: "fork",
    },
  ],
};
