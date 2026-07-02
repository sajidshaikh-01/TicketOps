pipeline {
    agent {
        label 'ticketops-agent'
    }
    stages{

        stage('Checkout'){
            steps {
                checkout scm
            }
        }

        stage('Verify Workspace') {
            steps {
                sh '''
                   pwd
                   ls -la
                   la apps
                '''
            }
        }
    }
}