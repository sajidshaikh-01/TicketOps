pipeline {
    agent {
        label 'ticketops-agent'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Verify') {
            steps {
                sh '''
                pwd
                ls -la
                git branch
                node -v
                docker --version
                java -version
                '''
            }
        }
    }
}