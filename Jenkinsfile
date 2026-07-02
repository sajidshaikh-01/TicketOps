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

        stage('Verify Workspace') {
            steps {
                sh '''
                    echo "Current Directory:"
                    pwd

                    echo "Git Branch:"
                    git branch

                    echo "Workspace Files:"
                    ls -la

                    echo "Apps:"
                    ls apps
                '''
            }
        }

    }
}