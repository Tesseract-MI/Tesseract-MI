import { Mongo } from 'meteor/mongo';
import { cornerstoneTools, cornerstone } from 'meteor/ohif:cornerstone';
import { $ } from 'meteor/jquery';
import { waitUntilExists } from 'jquery.waituntilexists';
import { Session } from 'meteor/session';


fiducialsCollection = new Mongo.Collection('fiducialsCollection', {connection: null});
const probeSynchronizer = new cornerstoneTools.Synchronizer('cornerstonenewimage', cornerstoneTools.stackImagePositionSynchronizer);
const toolsToSync = ['fiducial', 'aiFiducial'];
let fiducialCounter = {};


function getPatientPoint(imagePoint, element) {
    const image = cornerstone.getEnabledElement(element).image;
    const imagePlane = cornerstone.metaData.get('imagePlaneModule', image.imageId);
    const result = cornerstoneTools.imagePointToPatientPoint(imagePoint, imagePlane);

    Session.set('currentFidLps', result);

    return result;
}


function getImagePoint(patientPoint, element) {
    const image = cornerstone.getEnabledElement(element).image;
    const imagePlane = cornerstone.metaData.get('imagePlaneModule', image.imageId);
    const result = cornerstoneTools.projectPatientPointToImagePlane(patientPoint, imagePlane);

    return result;
}

function isInBoundary(element, coords) {
    const image = cornerstone.getEnabledElement(element).image;
    const width = image.width;
    const height = image.height;
    return 0 <= coords.x && coords.x <= width && coords.y <= height && 0 <= coords.y;
}

// TODO: clean and comment for all the functions
function addFiducial(element, measurementData, toolType) {

    if (!($('.report-btn a:first').hasClass('active'))) {
        $('.report-btn a:first').trigger('click');
        $('.roundedButtonWrapper[data-value="findings"]').trigger('click');
    } else {
        $('.roundedButtonWrapper[data-value="findings"]').trigger('click');
    }

    const studyInstanceUid = OHIF.viewerbase.layoutManager.viewportData[Session.get('activeViewport')]['studyInstanceUid'];
    const studyInstanceUidString = studyInstanceUid.toString();

    if (fiducialCounter.hasOwnProperty(studyInstanceUidString)) {
        fiducialCounter[studyInstanceUidString]++;
    }
    else {
        fiducialCounter[studyInstanceUidString] = 1;
    }

    cornerstoneTools.removeToolState(element, toolType, measurementData);
    cornerstone.updateImage(element);

    const patientPoint = getPatientPoint(measurementData.handles.end, element);
    let imageIds = [];

    $('.imageViewerViewport').each((index, ele) => {
      let elementSpecificMeasurementData = $.extend(true, {}, measurementData);
      const imagePoint = getImagePoint(patientPoint, ele);
      const id = fiducialCounter[studyInstanceUidString]

      if (measurementData.hasOwnProperty('server')) {
          id = 'server.'.concat(measurementData.f_id);
      }

      elementSpecificMeasurementData.handles.end.x = imagePoint.x;
      elementSpecificMeasurementData.handles.end.y = imagePoint.y;
      elementSpecificMeasurementData.id = id;
      elementSpecificMeasurementData.active = false;

      if (isInBoundary(ele, elementSpecificMeasurementData.handles.end)) {
          $(ele).off('cornerstonetoolsmeasurementadded');
          cornerstoneTools.addToolState(ele, toolType, elementSpecificMeasurementData);
          cornerstone.updateImage(ele);
          bindToMeasurementAdded(ele);

          imageIds.push(cornerstone.getEnabledElement(ele).image.imageId);
      }
    });

    if (!measurementData.hasOwnProperty('server')) {
        Session.set('lastFidId', fiducialCounter[studyInstanceUidString]);
        let fiducial = {
          'toolType': toolType,
          'id': fiducialCounter[studyInstanceUidString],
          'studyInstanceUid': studyInstanceUid,
          'imageIds': imageIds,
          'patientPoint': patientPoint
        }

        fiducialsCollection.insert(fiducial);
    }
    else {
        fiducialCounter[studyInstanceUidString]--;
    }
}


function descriptionMap(seriesDescription) {
    if (seriesDescription.includes('t2_tse_tra')) {
        return 'tra';
    }
    else if (seriesDescription.includes('_ADC')) {
        return 'adc';
    }
    else if (seriesDescription.includes('_BVAL')) {
        return 'hbval';
    }
    else if (seriesDescription.includes('KTrans')) {
        return 'ktrans';
    }
}


function removeFiducial(element, measurementData, toolType) {
    if (measurementData.hasOwnProperty('server')) {
        $(element).off('cornerstonetoolsmeasurementadded');
        cornerstoneTools.addToolState(element, toolType, measurementData);
        cornerstone.updateImage(element);
        bindToMeasurementAdded(element);
    }
    else if (measurementData.hasOwnProperty('id')) {
        $('.imageViewerViewport').each((index, ele) => {
          const toolData = cornerstoneTools.getElementToolStateManager(ele).get(ele, toolType);

          for (let i = 0; i < toolData.data.length; i++) {
              if (toolData.data[i].id === measurementData.id) {
                  toolData.data.splice(i, 1);
              }
          }

          cornerstone.updateImage(ele);
        });
        fiducialsCollection.remove({ 'id': measurementData.id });
    }
}


function modifyFiducial(element, measurementData, toolType) {
    const patientPoint = getPatientPoint(measurementData.handles.end, element);

    if (measurementData.hasOwnProperty('server')) {
        const imageId = cornerstone.getEnabledElement(element).image.imageId;
        const seriesDescription = cornerstone.metaData.get('series', imageId)['seriesDescription'];
        const patientName = OHIF.viewer.Studies.all()[0]['patientName'];
        const pos = Fiducials.findOne({ ProxID: patientName, fid: measurementData.f_id})[descriptionMap(seriesDescription)];
        measurementData.handles.end.x = pos.x;
        measurementData.handles.end.y = pos.y;
    }
    else {
        $('.imageViewerViewport').each((index, ele) => {
            if (ele !== element) {
                const toolData = cornerstoneTools.getElementToolStateManager(ele).get(ele, toolType);

                for (let i = 0; i < toolData.data.length; i++) {
                    if (toolData.data[i].id === measurementData.id) {
                        let elementSpecificMeasurementData = toolData.data[i];
                        const imagePoint = getImagePoint(patientPoint, ele);
                        elementSpecificMeasurementData.handles.end.x = imagePoint.x;
                        elementSpecificMeasurementData.handles.end.y = imagePoint.y;
                    }
                }

                cornerstone.updateImage(ele);
            }
        });

        let fiducial = {
          'patientPoint': patientPoint
        }

        fiducialsCollection.update({ 'id': measurementData.id }, { $set: fiducial });
    }
}


function bindToMeasurementAdded(element) {
    $(element).on('cornerstonetoolsmeasurementadded', (eve) => {
        let ev = eve.originalEvent;
        if (toolsToSync.includes(ev.detail.toolType)) {
            addFiducial(ev.target, ev.detail.measurementData, ev.detail.toolType);
        }
    });
}


function bindToMeasurementRemoved(element) {
    $(element).on('cornerstonemeasurementremoved', (eve) => {
        let ev = eve.originalEvent;
        if (toolsToSync.includes(ev.detail.toolType)) {
            removeFiducial(ev.target, ev.detail.measurementData, ev.detail.toolType);
        }
    });
}


function bindToMeasurementModified(element) {
    $(element).on('cornerstonetoolsmeasurementmodified', (eve) => {
        let ev = eve.originalEvent;
        if (toolsToSync.includes(ev.detail.toolType)) {
            $(this).off('mouseup').one('mouseup', () => {
                modifyFiducial(ev.target, ev.detail.measurementData, ev.detail.toolType);
            });
        }
    });
}


$('.imageViewerViewport').waitUntilExists((index, element) => {
      bindToMeasurementAdded(element);
      bindToMeasurementRemoved(element);
      bindToMeasurementModified(element);
});


$('.toolbarSectionTools').waitUntilExists((index, element) => {
    $(element).children().on('click', async (ev) => {
        const activeTool = ev.currentTarget.id;
        if (toolsToSync.includes(activeTool)) {
            $('.imageViewerViewport').each((index, ele) => {
                // TODO: not a good idea to wait till we scroll, see if there is a better way!
                probeSynchronizer.add(ele);
            });

            await function scroll() {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        const activeViewportIndex = Session.get('activeViewport');
                        const newIndex = OHIF.viewerbase.layoutManager.viewportData[activeViewportIndex]['currentImageIdIndex'];
                        const element = $('.imageViewerViewport')[activeViewportIndex];
                        cornerstoneTools.scrollToIndex(element, 1);
                        cornerstoneTools.scrollToIndex(element, newIndex);
                        resolve('resolved');
                    }, 1);
                });
            }();
        }
        else if (probeSynchronizer) {
            probeSynchronizer.destroy();
        }
    });
});

export { bindToMeasurementAdded };
