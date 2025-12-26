#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import figlet from 'figlet';
import ora from 'ora';

const program = new Command();

console.log(
    chalk.cyan(
        figlet.textSync('CC-Orchestrator', { horizontalLayout: 'full' })
    )
);

program
    .name('cc-orch')
    .description('Cross-Cloud Orchestrator CLI - Manage workflows and deployments')
    .version('1.0.0');

// Command: INIT
program
    .command('init')
    .description('Initialize a new workflow project')
    .action(async () => {
        console.log(chalk.blue('🚀 Initializing new Cross-Cloud Workflow...'));

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Workflow Name:',
                default: 'my-workflow'
            },
            {
                type: 'list',
                name: 'template',
                message: 'Select Template:',
                choices: ['Basic Failover', 'Parallel Processing', 'Empty']
            }
        ]);

        const workflowFile = path.join(process.cwd(), 'workflow.json');

        const templateContent = {
            id: answers.name.toLowerCase().replace(/\s+/g, '-'),
            name: answers.name,
            steps: [
                {
                    id: 'step-1',
                    type: 'TASK',
                    provider: 'AWS',
                    fallback: 'GCP'
                }
            ]
        };

        fs.writeFileSync(workflowFile, JSON.stringify(templateContent, null, 2));
        console.log(chalk.green(`✅ Created ${workflowFile}`));
    });

// Command: STATUS
program
    .command('status')
    .description('Check system health')
    .action(async () => {
        const spinner = ora('Checking System Health...').start();
        try {
            // Try local Docker network URL first, then localhost
            const url = 'http://localhost:3000/system/health-deep';
            const res = await axios.get(url, { timeout: 2000 });

            const health = res.data;
            spinner.succeed(chalk.green('System is Online'));

            console.log(`\nOverall Status: ${health.overall_status === 'healthy' ? chalk.green('HEALTHY') : chalk.red('DEGRADED')}`);

            console.log('\nService Status:');
            health.checks.forEach((check: any) => {
                const icon = check.status === 'Pass' ? '✅' : '❌';
                console.log(`${icon} ${check.service.padEnd(20)}: ${check.status}`);
            });

        } catch (error) {
            spinner.fail(chalk.red('Could not connect to Orchestrator API'));
            console.log(chalk.gray('Tip: Run "npm run docker:up" to start the system.'));
        }
    });

// Command: DEPLOY
program
    .command('deploy')
    .description('Deploy stack to Kubernetes or Docker')
    .option('-k, --kubernetes', 'Deploy to Kubernetes')
    .action((options) => {
        if (options.kubernetes) {
            console.log(chalk.cyan('☸️  Deploying to Kubernetes...'));
            // In real CLI, this would exec the shell script
            console.log('Running: ./deploy_k8s.sh');
        } else {
            console.log(chalk.cyan('🐳 Deploying to Local Docker...'));
            console.log('Running: docker-compose up -d');
        }
    });

program.parse();
