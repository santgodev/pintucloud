import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UiService {
    private sidebarVisibleSubject = new BehaviorSubject<boolean>(true);
    public sidebarVisible$ = this.sidebarVisibleSubject.asObservable();

    constructor() { }

    toggleSidebar() {
        this.sidebarVisibleSubject.next(!this.sidebarVisibleSubject.value);
    }

    setSidebarVisible(visible: boolean) {
        this.sidebarVisibleSubject.next(visible);
    }
}
