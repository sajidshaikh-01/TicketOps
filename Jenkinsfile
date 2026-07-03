pipeline {
    agent {
        label 'ticketops-agent'
    }

    environment {
        SONAR_HOST_URL = 'http://54.89.147.193:9000/'
        SONAR_PROJECT_KEY = 'ticketops'
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

        // stage('OWASP Dependency Check') {
        //     steps {
        //         catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
        //             sh '''
        //                 docker run --rm \
        //                 -v "$PWD:/src" \
        //                 -v owasp-dc-data:/usr/share/dependency-check/data \
        //                 owasp/dependency-check:latest \
        //                 --scan /src \
        //                 --format "HTML" --format "JSON" \
        //                 --out /src/dependency-check-report \
        //                 --project ticketops
        //             '''
        //         }
        //     }
        //     post {
        //         always {
        //             archiveArtifacts artifacts: 'dependency-check-report/**', allowEmptyArchive: true
        //         }
        //     }
        // }

        stage('SonarQube SAST') {
            steps {
                withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                    sh '''
                        docker run --rm \
                        --network host \
                        -v "$PWD:/usr/src" \
                        -w /usr/src \
                        sonarsource/sonar-scanner-cli:latest \
                        -Dsonar.host.url=${SONAR_HOST_URL} \
                        -Dsonar.login=${SONAR_TOKEN} \
                        -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                        -Dsonar.sources=apps,packages \
                        -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/generated/** \
                        -Dsonar.javascript.lcov.reportPaths=**/coverage/lcov.info
                    '''
                }
            }
        }
    }
}