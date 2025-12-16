/*
 * Copyright (c) 2014-2025 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import { expect } from 'chai'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

describe('CI/CD Workflow', () => {
  let ciWorkflow: any

  before(() => {
    // Load and parse the CI workflow file
    const workflowPath = path.join(__dirname, '../../.github/workflows/ci.yml')
    const workflowContent = fs.readFileSync(workflowPath, 'utf8')
    ciWorkflow = yaml.load(workflowContent)
  })

  describe('Node.js version setup', () => {
    it('should verify that Node.js version 20 is correctly set up in the CI environment', () => {
      const buildJob = ciWorkflow.jobs.build
      expect(buildJob).to.exist
      expect(buildJob.steps).to.be.an('array')

      // Find the Node.js setup step
      const setupNodeStep = buildJob.steps.find((step: any) =>
        step.name === 'Set up Node.js'
      )

      expect(setupNodeStep).to.exist
      expect(setupNodeStep.uses).to.equal('actions/setup-node@v2')
      expect(setupNodeStep.with).to.exist
      expect(setupNodeStep.with['node-version']).to.equal('20')
    })

    it('should ensure the setup step comes after checkout', () => {
      const buildJob = ciWorkflow.jobs.build
      const stepNames = buildJob.steps.map((step: any) => step.name)

      const checkoutIndex = stepNames.indexOf('Checkout code')
      const setupNodeIndex = stepNames.indexOf('Set up Node.js')

      expect(checkoutIndex).to.be.greaterThan(-1)
      expect(setupNodeIndex).to.be.greaterThan(-1)
      expect(setupNodeIndex).to.be.greaterThan(checkoutIndex)
    })
  })

  describe('Dependency installation', () => {
    it('should verify that all application dependencies are successfully installed', () => {
      const buildJob = ciWorkflow.jobs.build
      expect(buildJob).to.exist
      expect(buildJob.steps).to.be.an('array')

      // Find the Install dependencies step
      const installDepsStep = buildJob.steps.find((step: any) =>
        step.name === 'Install dependencies'
      )

      expect(installDepsStep).to.exist
      expect(installDepsStep.run).to.exist
      expect(installDepsStep.run).to.include('npm install')
    })

    it('should ensure dependency installation happens after Node.js setup', () => {
      const buildJob = ciWorkflow.jobs.build
      const stepNames = buildJob.steps.map((step: any) => step.name)

      const setupNodeIndex = stepNames.indexOf('Set up Node.js')
      const installDepsIndex = stepNames.indexOf('Install dependencies')

      expect(setupNodeIndex).to.be.greaterThan(-1)
      expect(installDepsIndex).to.be.greaterThan(-1)
      expect(installDepsIndex).to.be.greaterThan(setupNodeIndex)
    })

    it('should validate that package.json exists for dependency installation', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      expect(fs.existsSync(packageJsonPath)).to.be.true

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      expect(packageJson.dependencies).to.exist
      expect(Object.keys(packageJson.dependencies).length).to.be.greaterThan(0)
    })
  })

  describe('Unit test execution', () => {
    it('should verify that the unit tests defined by "npm test" execute without failure', () => {
      const buildJob = ciWorkflow.jobs.build
      expect(buildJob).to.exist
      expect(buildJob.steps).to.be.an('array')

      // Find the Run tests step
      const runTestsStep = buildJob.steps.find((step: any) =>
        step.name === 'Run tests'
      )

      expect(runTestsStep).to.exist
      expect(runTestsStep.run).to.exist
      expect(runTestsStep.run).to.include('npm test')
    })

    it('should ensure tests run after dependencies are installed', () => {
      const buildJob = ciWorkflow.jobs.build
      const stepNames = buildJob.steps.map((step: any) => step.name)

      const installDepsIndex = stepNames.indexOf('Install dependencies')
      const runTestsIndex = stepNames.indexOf('Run tests')

      expect(installDepsIndex).to.be.greaterThan(-1)
      expect(runTestsIndex).to.be.greaterThan(-1)
      expect(runTestsIndex).to.be.greaterThan(installDepsIndex)
    })

    it('should validate that test script is defined in package.json', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      expect(packageJson.scripts).to.exist
      expect(packageJson.scripts.test).to.exist
      expect(packageJson.scripts.test).to.be.a('string')
    })
  })

  describe('Application build', () => {
    it('should verify that the application builds successfully using "npm run build"', () => {
      const buildJob = ciWorkflow.jobs.build
      expect(buildJob).to.exist
      expect(buildJob.steps).to.be.an('array')

      // Find the Build step
      const buildStep = buildJob.steps.find((step: any) =>
        step.name === 'Build the app'
      )

      expect(buildStep).to.exist
      expect(buildStep.run).to.exist
      expect(buildStep.run).to.include('npm run build')
    })

    it('should ensure build runs after tests pass', () => {
      const buildJob = ciWorkflow.jobs.build
      const stepNames = buildJob.steps.map((step: any) => step.name)

      const runTestsIndex = stepNames.indexOf('Run tests')
      const buildIndex = stepNames.indexOf('Build the app')

      expect(runTestsIndex).to.be.greaterThan(-1)
      expect(buildIndex).to.be.greaterThan(-1)
      expect(buildIndex).to.be.greaterThan(runTestsIndex)
    })

    it('should validate that build scripts exist in package.json', () => {
      const packageJsonPath = path.join(__dirname, '../../package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

      expect(packageJson.scripts).to.exist
      // Check for frontend and server build scripts
      expect(packageJson.scripts['build:frontend']).to.exist
      expect(packageJson.scripts['build:server']).to.exist
    })
  })

  describe('JFrog Artifactory publishing', () => {
    it('should verify that the built application is successfully published to JFrog Artifactory', () => {
      const buildJob = ciWorkflow.jobs.build
      expect(buildJob).to.exist
      expect(buildJob.steps).to.be.an('array')

      // Find the Publish step
      const publishStep = buildJob.steps.find((step: any) =>
        step.name === 'Publish the application to JFrog Artifactory'
      )

      expect(publishStep).to.exist
      expect(publishStep.run).to.exist
      expect(publishStep.run).to.include('curl')
      expect(publishStep.run).to.include('ARTIFACTORY_URL')
      expect(publishStep.run).to.include('ARTIFACTORY_USERNAME')
      expect(publishStep.run).to.include('ARTIFACTORY_API_KEY')
    })

    it('should ensure publishing happens after build', () => {
      const buildJob = ciWorkflow.jobs.build
      const stepNames = buildJob.steps.map((step: any) => step.name)

      const buildIndex = stepNames.indexOf('Build the app')
      const publishIndex = stepNames.indexOf('Publish the application to JFrog Artifactory')

      expect(buildIndex).to.be.greaterThan(-1)
      expect(publishIndex).to.be.greaterThan(-1)
      expect(publishIndex).to.be.greaterThan(buildIndex)
    })

    it('should validate that required Artifactory environment variables are configured', () => {
      const buildJob = ciWorkflow.jobs.build
      const publishStep = buildJob.steps.find((step: any) =>
        step.name === 'Publish the application to JFrog Artifactory'
      )

      expect(publishStep.env).to.exist
      expect(publishStep.env.ARTIFACTORY_URL).to.exist
      expect(publishStep.env.ARTIFACTORY_USERNAME).to.exist
      expect(publishStep.env.ARTIFACTORY_API_KEY).to.exist
    })

    it('should verify that the publish command uses PUT method', () => {
      const buildJob = ciWorkflow.jobs.build
      const publishStep = buildJob.steps.find((step: any) =>
        step.name === 'Publish the application to JFrog Artifactory'
      )

      expect(publishStep.run).to.include('-X PUT')
    })

    it('should verify that the correct artifact path is referenced', () => {
      const buildJob = ciWorkflow.jobs.build
      const publishStep = buildJob.steps.find((step: any) =>
        step.name === 'Publish the application to JFrog Artifactory'
      )

      expect(publishStep.run).to.include('./dist/juice-shop.tar.gz')
      expect(publishStep.run).to.include('juice-shop/latest/juice-shop.tar.gz')
    })
  })

  describe('Workflow triggers', () => {
    it('should verify workflow is triggered on push to main branch', () => {
      expect(ciWorkflow.on).to.exist
      expect(ciWorkflow.on.push).to.exist
      expect(ciWorkflow.on.push.branches).to.include('main')
    })

    it('should verify workflow is triggered on pull requests to main branch', () => {
      expect(ciWorkflow.on).to.exist
      expect(ciWorkflow.on.pull_request).to.exist
      expect(ciWorkflow.on.pull_request.branches).to.include('main')
    })
  })

  describe('Job configuration', () => {
    it('should verify the job runs on ubuntu-latest', () => {
      const buildJob = ciWorkflow.jobs.build
      expect(buildJob['runs-on']).to.equal('ubuntu-latest')
    })

    it('should verify all required steps are present in correct order', () => {
      const buildJob = ciWorkflow.jobs.build
      const stepNames = buildJob.steps.map((step: any) => step.name)

      const expectedSteps = [
        'Checkout code',
        'Set up Node.js',
        'Install dependencies',
        'Run tests',
        'Build the app',
        'Publish the application to JFrog Artifactory'
      ]

      expectedSteps.forEach(expectedStep => {
        expect(stepNames).to.include(expectedStep)
      })

      // Verify order
      for (let i = 1; i < expectedSteps.length; i++) {
        const prevIndex = stepNames.indexOf(expectedSteps[i - 1])
        const currIndex = stepNames.indexOf(expectedSteps[i])
        expect(currIndex).to.be.greaterThan(prevIndex, 
          `${expectedSteps[i]} should come after ${expectedSteps[i - 1]}`)
      }
    })
  })
})
