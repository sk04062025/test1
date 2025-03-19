import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, getFieldValue, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { FlowNavigationNextEvent } from 'lightning/flowSupport';

// Case object fields
import FACILITY_AMOUNT_FIELD from '@salesforce/schema/Case.Facility_Amount__c';
import CASE_ID_FIELD from '@salesforce/schema/Case.Id';

// Lending Activity object fields
import DRAWDOWN_AMOUNT_FIELD from '@salesforce/schema/Lending_Activity__c.Amount_of_Drawdown__c';
import ACTIVITY_ID_FIELD from '@salesforce/schema/Lending_Activity__c.Id';
import ACTIVITY_CASE_FIELD from '@salesforce/schema/Lending_Activity__c.Case__c';

export default class DrawdownValidator extends LightningElement {
    @api availableActions = [];

    @api recordId; // This will be the Lending Activity record Id
    @api caseRecordId; // This can be passed from Flow
    @track activityId;
    @track caseId;
    @track facilityAmount = 0;
    @track drawdownAmount = 0;
    @track showError = false;
    @track errorMessage = '';
    
    // Wire to get the Lending Activity record details
    @wire(getRecord, { 
        recordId: '$recordId', 
        fields: [ACTIVITY_ID_FIELD, ACTIVITY_CASE_FIELD, DRAWDOWN_AMOUNT_FIELD] 
    })
    wiredActivity({ error, data }) {
        if (data) {
            this.activityId = this.recordId;
            // If caseRecordId is provided by flow, use it; otherwise get it from the activity
            this.caseId = this.caseRecordId || getFieldValue(data, ACTIVITY_CASE_FIELD);
            this.drawdownAmount = getFieldValue(data, DRAWDOWN_AMOUNT_FIELD) || 0;
            this.error = undefined;
        } else if (error) {
            this.handleError(error);
        }
    }
    
    // Wire to get the Case record details once we have the Case Id
    @wire(getRecord, { 
        recordId: '$caseId', 
        fields: [CASE_ID_FIELD, FACILITY_AMOUNT_FIELD] 
    })
    wiredCase({ error, data }) {
        if (data) {
            this.facilityAmount = getFieldValue(data, FACILITY_AMOUNT_FIELD) || 0;
            this.error = undefined;
        } else if (error) {
            this.handleError(error);
        }
    }
    
    // Handle changes to the drawdown amount field
    handleDrawdownChange(event) {
        const value = event.detail.value;
        // If value is empty string, convert to null for proper validation
        this.drawdownAmount = value === '' ? null : value;
        // Validate on each keystroke to provide immediate feedback
        this.validateDrawdownAmount();
    }
    
    // Validate that the drawdown amount is not greater than the facility amount
    validateDrawdownAmount() {
        // Check for blank, null, or zero values
        if (this.drawdownAmount === null || this.drawdownAmount === undefined || this.drawdownAmount === '' || parseFloat(this.drawdownAmount) === 0) {
            this.showError = true;
            this.errorMessage = 'Drawdown amount is required and cannot be blank or zero.';
            return false;
        }
        
        // Convert to numbers for comparison to ensure proper validation
        const drawdownAmountNum = parseFloat(this.drawdownAmount);
        const facilityAmountNum = parseFloat(this.facilityAmount);
        
        if (drawdownAmountNum > facilityAmountNum) {
            this.showError = true;
            this.errorMessage = 'Drawdown amount cannot exceed the facility amount.';
            return false;
        } else {
            this.showError = false;
            this.errorMessage = '';
            return true;
        }
    }
    
    // Handle form submission
    handleSubmit() {
        // Validate the drawdown amount before submitting
        if (this.validateDrawdownAmount()) {
            // Create the record input for update
            const fields = {};
            fields[ACTIVITY_ID_FIELD.fieldApiName] = this.activityId;
            fields[DRAWDOWN_AMOUNT_FIELD.fieldApiName] = this.drawdownAmount;
            
            const recordInput = { fields };
            
            // Update the record
            updateRecord(recordInput)
                .then(() => {
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Drawdown amount updated',
                            variant: 'success'
                        })
                    );
                    
                    // Navigate to the next screen in the flow if available
                    if (this.availableActions.includes('NEXT')) {
                        this.dispatchEvent(new FlowNavigationNextEvent());
                    }
                })
                .catch(error => {
                    this.handleError(error);
                });
        }
    }
    
    // Handle form success
    handleSuccess() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Success',
                message: 'Drawdown amount updated',
                variant: 'success'
            })
        );
        
        // Navigate to the next screen in the flow if available
        if (this.availableActions.includes('NEXT')) {
            this.dispatchEvent(new FlowNavigationNextEvent());
        }
    }
    
    // Handle errors
    handleError(error) {
        this.showError = true;
        this.errorMessage = error.body.message || 'Unknown error occurred.';
        
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error',
                message: this.errorMessage,
                variant: 'error'
            })
        );
    }
    
    // Handle cancel button
    handleCancel() {
        // We're in a flow, just reset values
        this.drawdownAmount = 0;
        this.showError = false;
    }
}
