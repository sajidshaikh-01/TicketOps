pipeline {
    agent {
        label 'ticketops-agent'
    }
    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHA = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()

                    env.GIT_BRANCH_NAME = env.BRANCH_NAME ?: sh(
                        script: 'git rev-parse --abbrev-ref HEAD',
                        returnStdout: true
                    ).trim()
                }
                echo "Building commit ${env.GIT_SHA}"
                echo "Building branch ${env.GIT_BRANCH_NAME}"
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Code Quality') {
            steps {
                sh 'npm run lint --workspaces --if-present'
                sh 'npm run typecheck --workspaces --if-present'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm run test:cov --workspaces --if-present'
            }
            post {
                always {
                    archiveArtifacts artifacts: '**/coverage/**', allowEmptyArchive: true
                }
            }
        }
    }
}

