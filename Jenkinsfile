// Using 'declarative' pipeline syntax.
@Library('DRC_Global_Pipeline_Libraries@v1.9.1')
def arti_RepoMap = [ 'master': 'drc-release', 'develop': 'drc-dev' ]
def br_map = ['develop': 'develop', 'master': 'master']
def scmVars = [:]

pipeline {
  tools {
    nodejs 'NODE_8100'
  }
  environment {
    leAcctNum = "177429746880"
    prodAcctNum = "385888483640"
    googlechatroom = 'https://chat.googleapis.com/v1/spaces/AAAA8dbSMQo/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=1pSXTA9tShH2p2ZzlXLSFTEEy85DM_OUnNbd4AH9raI%3D'
  }
  // can we run any of this on non-aws agents?
  agent {
    node {
      label 'coel7_agent_aws&&aws&&role_prod'
    }
  }
  triggers {
    issueCommentTrigger('.*test this please.*')
  }
  options { buildDiscarder(logRotator(daysToKeepStr: '3', artifactDaysToKeepStr: '3')) }

  stages {
    stage('Test') {
      when {
        anyOf { branch br_map[env.BRANCH_NAME]; branch 'PR-*' }
      }
      steps {
        ansiColor('xterm') {
          withEnv(["PATH=${env.PATH}:./node_modules/.bin"]) {
            sh 'npm -version'
            sh 'npm install'
           // sh 'yamllint configs/*.yml'
           // sh 'yamllint serverless.yml'
            lock(resource: "response-submission-udb-tests", inversePrecedence: true) {
              drc_AwsAssumeRole([acctNum: leAcctNum,
                                 appName: 'response-submission-udb-tests',
                                 bldNum : env.BUILD_NUMBER,
                                 jenkinsRole: "Terraform-Jenkins-Role" ])
            //sh 'npm run jenkins-test'
            }
          }
        }
      }
      post {
        success {
    //       publishHTML allowMissing: false, alwaysLinkToLastBuild: false, keepAll: true, reportDir: 'artifacts/coverage', reportFiles: 'index.html', reportName: 'Code Coverage Report', reportTitles: ''
    //       cobertura autoUpdateHealth: false, autoUpdateStability: false, coberturaReportFile: 'artifacts/coverage/cobertura*.xml', conditionalCoverageTargets: '80, 0, 0', failUnhealthy: false, failUnstable: false, lineCoverageTargets: '80, 0, 0', maxNumberOfBuilds: 0, methodCoverageTargets: '80, 0, 0', onlyStable: false, sourceEncoding: 'ASCII', zoomCoverageChart: false
          stash excludes: 'artifacts/**/*, node_modules/.cache/**/*', name: "source-b-${env.BRANCH_NAME.replace('/', '-')}-${env.BUILD_NUMBER}"
        }
    //     //always {
    //     //  junit 'artifacts/test/*.xml'
    //     //  publishHTML allowMissing: false, alwaysLinkToLastBuild: false, keepAll: true, reportDir: 'artifacts/test', reportFiles: 'xunit.html', reportName: 'Unit Test Report', reportTitles: ''
    //     //}
      }
    }
    stage('Deploy From Develop') {
      when {
        branch 'develop'
      }
      steps {
        script {
          def deployTargets = [
                  [env: 'dev', regions: [[region: 'us-east-2', globalTable: false], [region: 'us-east-1', globalTable: true]], askForPermission: false, acctNum: leAcctNum],
                  [env: 'sqa', regions: [[region: 'us-east-2', globalTable: false], [region: 'us-east-1', globalTable: true]], askForPermission: false, acctNum: leAcctNum],
                  [env: 'staging', regions: [[region: 'us-east-2', globalTable: false], [region: 'us-east-1', globalTable: true]], askForPermission: false, acctNum: leAcctNum],
                  [env: 'lt', regions: [[region: 'us-east-2', globalTable: false], [region: 'us-east-1', globalTable: true]], askForPermission: false, acctNum: leAcctNum],
          ]
          def tasksToExec = generateDeployTasks deployTargets

          tasksToExec.each { k, v -> v() }
        }
      }
    }
    stage('Smoke-Test Lower Environments') {
      when {
        branch 'develop'
      }
      steps {
        script {
          def tasksToExec = generateVerificationTasks(leAcctNum, [
          'development',
          'sqa',
          'staging',
          'lt'
          ])
          parallel tasksToExec
        }
      }
    }
    stage('Deploy From Master') {
      when {
        branch 'master'
      }
      steps {
        script {
          def deployTargets = [
                  [env: 'production', regions: [[region: 'us-east-2', globalTable: false], [region: 'us-east-1', globalTable: true]], askForPermission: true, acctNum: prodAcctNum],
          ]
          def tasksToExec = generateDeployTasks deployTargets

          tasksToExec.each { k, v -> v() }
        }
      }
    }
  }
}

def generateVerificationTasks(acctNum, envNames) {
  drc_AwsAssumeRole([acctNum: acctNum,
                     appName: 'response-submission-udb-service',
                     bldNum : env.BUILD_NUMBER,
                     timeout: 1800])

  def verifyTasks = [:]
  // download jmeter
  envNames.each { envName ->
  }
  return verifyTasks
}

def generateDeployTasks(targets) {

  // deployTasks will contain the list of parallel jobs to execute.
  def deployTasks = [:]
  // generate job definitions to execute in parallel from `targets`.
  targets.each { deploy ->
    deploy.regions.each { regionElement ->
      def slsStage = "${deploy.env}"
      def result = 'SUCCESS'
      def acctNum = deploy.acctNum
      def askForPermission = deploy.askForPermission
      def region = regionElement.region
      def isGlobalTableDeploy = regionElement.globalTable
      def globalTableText = ""

      if (isGlobalTableDeploy) {
        globalTableText = "Global Table "
      }

      // define each deploy task as a closure so it defers execution.
      deployTasks["${slsStage}-${region}"] = {
        // Execute on nodes (i.e. slaves) with this label
        node('coel7_agent_aws&&aws&&role_prod') {
          // Only the main execution gets auto-checkout, parallel jobs need to explicitly checkout.
          // Here's the main work for doing the deploy.
          stage("deploy ${slsStage}-${region}") {

            if (askForPermission) {
            //googlechatnotification message: "Need approval to deploy to ${stg}: '${env.JOB_NAME} [${env.BUILD_NUMBER}]', (<${env.BUILD_URL}|Link>)", url: "${googlechatroom}"
            result = drc_AskForPermissionSkip([name       : "Deploy ${slsStage}",
                                               to_time    : 2,
                                               to_unit    : 'HOURS',
                                               id         : "DeployTo${slsStage}",
                                               message    : "Deploy to ${slsStage} or abort?",
                                               submitter  : "grees,pnambiar,dbellandi,bruth,kptak"])
            }

            echo "current build status = ${currentBuild.result}"
            if (result == 'ABORTED') {
                echo "Pipeline Aborted"
                googlechatnotification message: "Deployment to ${slsStage} aborted for '${env.JOB_NAME} [${env.BUILD_NUMBER}]', (<${env.BUILD_URL}|Link>)", url: "${googlechatroom}"
                error('Pipeline aborted')
            } else if (result == 'SKIPPED'){
                echo "Pipeline skipped for ${slsStage}"
            } else {
                googlechatnotification message: "Deployment to ${slsStage} approved for '${env.JOB_NAME} [${env.BUILD_NUMBER}]', (<${env.BUILD_URL}|Link>)", url: "${googlechatroom}"
                scmVars = checkout scm

                withEnv(["PATH=./node_modules/.bin:${env.PATH}"]) {
                  sh 'npm install'
                  sh "rm -rf slspkg/${slsStage}/${region}/"
                  sh "mkdir -p slspkg/${slsStage}/${region}/"
                  sh "chmod -R a+rX slspkg/${slsStage}/${region}/"
                  sh 'chmod -R ugo+r .'
                  drc_AwsAssumeRole([acctNum: acctNum,
                                    appName: "response-submission-udb-service",
                                    bldNum : env.BUILD_NUMBER])

                  sh "umask 0022 && sls package --stage ${slsStage} --region ${region} --package slspkg/${slsStage}/${region}"
                  sh "umask 0022 && sls deploy --stage ${slsStage} --region ${region} --package slspkg/${slsStage}/${region} --verbose"
                  if (isGlobalTableDeploy) {
                    sh "umask 0022 && sls global-table deploy --stage ${slsStage} --global-table-regions us-east-1,us-east-2"
                  }
                }
                echo "Build Successful"
                echo "Deployed ${slsStage}"
            }
          }
        }
      }
    }
  }

  return deployTasks
}