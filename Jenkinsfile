pipeline {
    agent {
        label 'ticketops-agent'
    }

    environment {
        SONAR_HOST_URL     = 'http://54.89.147.193:9000/'
        SONAR_PROJECT_KEY  = 'ticketops'
        IMAGE_PREFIX       = 'sajid0100/ticketops'
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
                cache(maxCacheSize: 1000, caches: [
                    arbitraryFileCache(
                        path: '.npm-cache',
                        cacheValidityDecidingFile: 'package-lock.json'
                    )
                ]) {
                    sh 'npm ci --cache .npm-cache'
                }
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

        stage('OWASP Dependency Check') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh '''
                        docker run --rm \
                        -v "$PWD:/src" \
                        -v owasp-dc-data:/usr/share/dependency-check/data \
                        owasp/dependency-check:latest \
                        --scan /src \
                        --format "HTML" --format "JSON" \
                        --out /src/dependency-check-report \
                        --project ticketops
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'dependency-check-report/**', allowEmptyArchive: true
                }
            }
        }

        stage('SonarQube SAST') {
            steps {
                script {
                    env.SCANNER_HOME = tool 'sonar-scanner'
                }
                sh '''
                    sed -i "s#^SF:src/#SF:apps/events-api/src/#" apps/events-api/coverage/lcov.info || true
                    sed -i "s#^SF:src/#SF:apps/admin-api/src/#" apps/admin-api/coverage/lcov.info || true
                    sed -i "s#^SF:src/#SF:apps/bookings-worker/src/#" apps/bookings-worker/coverage/lcov.info || true
                '''
                withSonarQubeEnv('ticketops-sonarqube') {
                    withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                        sh '''
                            "$SCANNER_HOME"/bin/sonar-scanner \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.login=${SONAR_TOKEN} \
                            -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                            -Dsonar.sources=apps,packages \
                            -Dsonar.exclusions=**/node_modules/**,**/dist/**,**/coverage/**,**/generated/** \
                            -Dsonar.javascript.lcov.reportPaths=apps/events-api/coverage/lcov.info,apps/admin-api/coverage/lcov.info,apps/bookings-worker/coverage/lcov.info
                        '''
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    def services = ['events-api', 'admin-api', 'bookings-worker', 'dashboard']
                    for (svc in services) {
                        sh """
                            docker build \
                              -t ${env.IMAGE_PREFIX}-${svc}:${env.GIT_SHA} \
                              -t ${env.IMAGE_PREFIX}-${svc}:${env.GIT_BRANCH_NAME} \
                              -f apps/${svc}/Dockerfile .
                        """
                    }
                }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                script {
                    def services = ['events-api', 'admin-api', 'bookings-worker', 'dashboard']
                    for (svc in services) {
                        catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                            sh """
                                trivy image \
                                --severity HIGH,CRITICAL \
                                --format table \
                                --output trivy-report-${svc}.txt \
                                --exit-code 0 \
                                ${env.IMAGE_PREFIX}-${svc}:${env.GIT_SHA}
                            """
                        }
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report-*.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Docker Push') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    def services = ['events-api', 'admin-api', 'bookings-worker', 'dashboard']
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                        for (svc in services) {
                            sh """
                                docker push ${env.IMAGE_PREFIX}-${svc}:${env.GIT_SHA}
                                docker push ${env.IMAGE_PREFIX}-${svc}:${env.GIT_BRANCH_NAME}
                            """
                        }
                    }
                }
            }
            post {
                always {
                    sh 'docker logout'
                }
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                    docker image prune -af || true
                    docker builder prune -af || true
                '''
            }
        }
    }
}