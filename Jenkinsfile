pipeline {
    agent {
        label 'ticketops-agent'
    }
    stages{

        stage('Checkout'){
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
        stage('Installl Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        stage(Lint) {
            steps {

                sh 'npm run lint --workspaces --if-present'
            }
        }

        stage('Build') {
        steps {
            sh 'npm run build'
            }
        }
    }
}