
class AlertHandler {
    constructor(document, alertDivId) {
        this.document = document;
        this.alertDiv = document.getElementById(alertDivId);
        
        this.alert_counter = 0;

        this.temp_alert_element = document.createElement('div');
        this.temp_alert_active = false;
        this.temp_alert_timeout = 0;
        this.curr_temp_alert_id = 0;

        this.static_alert_by_id = {};
    }

    #__get_new_id() {
        this.alert_counter++;
        return this.alert_counter;
    }

    // remove the temp alert element from the alert div
    #__upon_temp_alert_timeout() {
        if (this.temp_alert_active) {
            this.alertDiv.removeChild(this.temp_alert_element);
            this.temp_alert_active = false;
            return true;
        }
        return false;
    }

    // delete the static alert element from the alert div
    #__upon_static_alert_timeout(alert_id) {
        const static_alert_element = this.static_alert_by_id[alert_id];
        if (static_alert_element) {
            this.alertDiv.removeChild(static_alert_element);
            delete this.static_alert_by_id[alert_id];
            return true;
        } else {
            console.debug('Alert with id ' + alert_id + ' not found or has been deleted already');
            return false;
        }
    }

    show_temp_alert(text, duration = 300) {
        this.curr_temp_alert_id = this.#__get_new_id();
        this.temp_alert_element.textContent = text;
        if (!this.temp_alert_active) {
            this.alertDiv.appendChild(this.temp_alert_element);
            this.temp_alert_active = true;
        }
        clearTimeout(this.temp_alert_timeout);
        this.temp_alert_timeout = setTimeout(() => {
            this.#__upon_temp_alert_timeout();
        }, duration);
        this.alertDiv.scrollTop = this.alertDiv.scrollHeight;
        return this.curr_temp_alert_id; 
    }

    remove_alert(alert_id) {
        if (this.curr_temp_alert_id === alert_id) {
            clearTimeout(this.temp_alert_timeout);
            this.#__upon_temp_alert_timeout();
            return true;
        } else {
            return this.#__upon_static_alert_timeout(alert_id);
        }
    }

    show_static_alert(text, duration = 1000) {
        // NOTE: Removing the temp alert
        // Otherwise we need to ensure that the temp alert remains at the top of the alert div
        this.remove_alert(this.curr_temp_alert_id);

        // create a new static alert element
        const static_alert_element = this.document.createElement('div');
        const alert_id = this.#__get_new_id();
        static_alert_element.textContent = text;
        this.alertDiv.prepend(static_alert_element);
        this.static_alert_by_id[alert_id] = static_alert_element;
        setTimeout(() => {
            this.#__upon_static_alert_timeout(alert_id);
        }, duration);
        this.alertDiv.scrollTop = this.alertDiv.scrollHeight;
        return alert_id
    }

}

export {
    AlertHandler
}
