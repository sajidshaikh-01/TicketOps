pipeline {
    agent {
        label 'ticketops-agent'
    }

    environment {
        SONAR_HOST_URL      = 'http://54.89.147.193:9000/'
        SONAR_PROJECT_KEY   = 'ticketops'
        AWS_REGION          = 'us-east-1'
        ECR_REGISTRY        = '674182809289.dkr.ecr.us-east-1.amazonaws.com'
        ECR_PREFIX          = 'ticketops-dev'
        GITOPS_REPO_URL     = 'https://github.com/sajidshaikh-01/ticketops-platform.git'
        GITOPS_REPO_BRANCH  = 'develop'
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
                              -t ${env.ECR_REGISTRY}/${env.ECR_PREFIX}-${svc}:${env.GIT_SHA} \
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
                                ${env.ECR_REGISTRY}/${env.ECR_PREFIX}-${svc}:${env.GIT_SHA}
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

        stage('ECR Push') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    def services = ['events-api', 'admin-api', 'bookings-worker', 'dashboard']
                    sh """
                        aws ecr get-login-password --region ${env.AWS_REGION} | \
                        docker login --username AWS --password-stdin ${env.ECR_REGISTRY}
                    """
                    for (svc in services) {
                        sh """
                            docker push ${env.ECR_REGISTRY}/${env.ECR_PREFIX}-${svc}:${env.GIT_SHA}
                        """
                    }
                }
            }
            post {
                always {
                    sh 'docker logout ${ECR_REGISTRY} || true'
                }
            }
        }

        stage('Update GitOps Repo') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'ticketops-platform-git-write', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_PASS')]) {
                    sh '''
                        cat > /tmp/git-askpass.sh << 'EOF'
#!/bin/sh
echo "$GIT_PASS"
EOF
                        chmod +x /tmp/git-askpass.sh
                    '''
                    withEnv(['GIT_ASKPASS=/tmp/git-askpass.sh']) {
                        retry(3) {
                            sh """
                                rm -rf gitops-repo
                                git clone -b ${env.GITOPS_REPO_BRANCH} https://\$GIT_USER@github.com/sajidshaikh-01/ticketops-platform.git gitops-repo
                            """
                        }

                        sh """
                            cd gitops-repo

                            yq -i '.image.tag = "${env.GIT_SHA}"' helm/ticketops-service/values/dev/events-api.yaml
                            yq -i '.image.tag = "${env.GIT_SHA}"' helm/ticketops-service/values/dev/admin-api.yaml
                            yq -i '.image.tag = "${env.GIT_SHA}"' helm/ticketops-service/values/dev/bookings-worker.yaml
                            yq -i '.image.tag = "${env.GIT_SHA}"' helm/ticketops-service/values/dev/dashboard.yaml

                            git config user.email "jenkins@ticketops.local"
                            git config user.name "Jenkins CI"

                            git add helm/ticketops-service/values/dev/*.yaml
                            git commit -m "chore: update image tags to ${env.GIT_SHA} [ci skip]" || echo "No changes to commit"
                        """

                        retry(3) {
                            sh """
                                cd gitops-repo
                                git push origin ${env.GITOPS_REPO_BRANCH}
                            """
                        }
                    }
                }
            }
            post {
                always {
                    sh 'rm -rf gitops-repo /tmp/git-askpass.sh || true'
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