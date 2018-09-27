# Tesseract-MI

Tesseract-MedicalImaging (Tesseract-MI) is an open-source, web-based platform which enables deployment of AI models while simultaneously providing standard image viewing and reporting schemes. The goal of Tesseract-MI is to augment 3D medical imaging and provide a 4th dimension (AI) when requested by a user. Tesseract-MI platform consists of an image viewer, a  DICOM server, a reporting UI, and AI-assisted probe for on-demand processing of findings.

## This project will not run without a study and AI model

Please checkout [prostatecancer.ai](https://github.com/Tesseract-MI/prostatecancer.ai) project to learn how to add cancer studies and AI models.


Installation
---------
What you need:

1. DICOM server (dcm4che or Orthnac)
2. Meteor to run the app


How to start the app:

1. In the app directory:
    * to install npm packages run: `meteor npm install`

2. In the app directory:
    * for orthanc run: `METEOR_PACKAGE_DIRS="packages" meteor`
    * for dcm4chee run: `METEOR_PACKAGE_DIRS="packages" meteor --settings config/dcm4cheeDICOMWeb.json`
    
For Developers
---------
Technologies:

* Docker
* Meteor
* MongoDB
* BlazeJs/Spacebars
* Node.js
* JavaScript
* HTML
* CSS/Stylus
* VPS

Main app components:

**tesseract-ai**:
Components and functionality for AI.

**tesseract-fiducial**:
Similar to cornerstone tools probe with customizable information.

**tesseract-report**:
Reporting area for any predictions and calculations, also contains the settings for AI models.

**tesseract-server-probe**:
A cornerstone tool probe like tool that displays findings on the DICOM images. The probe cannot be deleted or manipulated by user.

**tesseract-sync-scroll**:
A toll similar to crosshair tool from cornerstone tools to sync the scrolling on view ports.

**tesseract-cancer-study**:
A replaceable package to add different cancer studies to the app.

**tesseract-sync-tools**:
A tool to sync tools like probe or any other drawing tool.


AI model Deployment: 
---------- 
Models folder include different models and their codes. “pcad.py” is the Flask app which serves predictions with the selected Keras model. By default, one of the available models is loaded and ready to use by the user.

Specification for each model:
Each AI model folder needs to have a python class called deploy which is consisted of a build and run methods. By decoupling the model build and model run, fast prediction time is guaranteed. 

1. **Build**: once called, the model architecture is built and the saved weights will be loaded. 
2. **Run(model, info)**: contains the code and the designed algorithm, including preprocessing, prediction and post processing. Info is json file containing the case_number(id) and the desired location specified by the user in the Viewer which was sent to the Flask app (in LPS)



Deploying to Production VPS
---------
You need app specific files on App's root directory for deploying to server:

1. Orthanc configuration file **orthanc.json**, generate this file by following <a href="http://book.orthanc-server.com/users/docker.html#id5" target="_blank">this</a> instruction
2. App configuration **production.env** which is similar to development.env file
3. In **models** directory run ```docker-compose up -d```
4. In **main** directory run ```docker-compose up -d```

These files contain all the confirmation and important information like password and server IP for orthanc and MongoDB to connect.

Orthanc username and password can be changed in orthanc.json file.

Orthanc Installation
---------
### Docker usage
Following the instructions below, the docker image will listen for DICOM connections on port 4242, and for web traffic on port 8042. The default username for the web interface is `orthanc`, and the password is `orthanc`.
#### Temporary data storage
````
docker run --rm -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
````

#### Persistent data storage
1. Create a persistant data volume for Orthanc to use

    ````
    docker create --name sampledata -v /sampledata jodogne/orthanc-plugins
    ````

    **Note: On Windows, you need to use an absolute path for the data volume, like so:**

    ````
    docker create --name sampledata -v '//C/Users/erik/sampledata' jodogne/orthanc-plugins
    ````

2. Run Orthanc from Docker with the data volume attached

    ````
    docker run --volumes-from sampledata -p 4242:4242 -p 8042:8042 jodogne/orthanc-plugins
    ````

3. Upload your data and it will be persisted


dcm4che Installation
---------
How to install dcm4che:

1. Install docker-compose https://docs.docker.com/compose/install/
2. Clone dcm4che from https://github.com/dcm4che-dockerfiles/dcm4chee-arc-psql
3. Run `docker-compose up` in dcm4che directory
