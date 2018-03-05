﻿import { Component, Input, Output, EventEmitter, OnDestroy } from "@angular/core";
import { Http } from "@angular/http";
import { map } from "rxjs/operators";
import { Config } from "../app.config";

interface IStatus
{
	started?: Date;
	uptime: string;
	isRunning: boolean;
	version: string;
	environment: string;
	port?: number;
	openProtocol?: number;
	OPCUA?: number[];
	controllers?: { [key: string]: string; };
	clients?: { [key: string]: string; };
}

@Component({
	selector: "ichen-home",
	template: `
		<div class="card">
			<div class="card-header text-center" [class.badge-success]="status?.isRunning" [class.badge-danger]="!status?.isRunning">
				<img *ngIf="isBusy" height="20" class="title-bar-indicator" src="images/common/loading.gif" />
				<h4 *ngIf="status?.isRunning">{{i18n.textServerRunning}}</h4>
				<h4 *ngIf="!status?.isRunning">{{i18n.textServerNotRunning}}</h4>
			</div>
			<table class="table table-striped table-sm">
				<tr><td>{{i18n.labelTimeStarted}}</td><td class="text-center">{{status?.started|date:'yyyy-M-d h:mm a'}}<span *ngIf="!status?.started">{{i18n.labelUnknown}}</span></td></tr>
				<tr><td>{{i18n.labelUpTime}}</td><td class="text-center">{{status?.uptime || i18n.labelUnknown}}</td></tr>
				<tr><td>{{i18n.labelServerVersion}}</td><td class="text-center">{{status?.version || i18n.labelUnknown}}</td></tr>
				<tr><td>{{i18n.labelOsVersion}}</td><td class="text-center">{{status?.environment || i18n.labelUnknown}}</td></tr>
				<tr><td>{{i18n.labelWebServerPort}}</td><td class="text-center">{{status?.port || i18n.labelNone}}</td></tr>
				<tr><td>{{i18n.labelOpenProtocolPort}}</td><td class="text-center">{{status?.openProtocol || i18n.labelNone}}</td></tr>
				<tr><td>{{i18n.labelOPCUA}}</td><td class="text-center">
					<div *ngIf="status?.OPCUA">
						<div *ngFor="let addr of status?.OPCUA">{{addr}}</div>
					</div>
					<div *ngIf="!status?.OPCUA">{{i18n.labelNA}}</div>
				</td></tr>
				<tr><td>{{i18n.labelNumClients}}</td><td class="text-center">{{clientsList?.length || 0}}</td>
				<tr><td>{{i18n.labelNumMachines}}</td><td class="text-center">{{controllersList?.length || 0}}</td></tr>
			</table>
		</div>

		<div #panelClients *ngIf="clientsList?.length" class="card">
			<div class="card-header badge-secondary">
				<span class="glyphicon glyphicon-blackboard"></span>&nbsp;&nbsp;{{i18n.labelConnectedClients}}
				<span (click)="panelClients.isCollapsed=!panelClients.isCollapsed" class="title-bar-button glyphicon" [class.glyphicon-minus]="!panelClients.isCollapsed" [class.glyphicon-plus]="panelClients.isCollapsed"></span>
			</div>
			<ul *ngIf="!panelClients.isCollapsed" class="list-group list-group-flush">
				<li *ngFor="let client of clientsList" class="list-group-item">{{client.key}} &bull; {{client.description}}</li>
			</ul>
		</div>

		<div #panelControllers *ngIf="controllersList?.length" class="card">
			<div class="card-header badge-info">
				<span class="glyphicon glyphicon-hdd"></span>&nbsp;&nbsp;{{i18n.labelConnectedMachines}}
				<span (click)="panelControllers.isCollapsed=!panelControllers.isCollapsed" class="title-bar-button glyphicon" [class.glyphicon-minus]="!panelControllers.isCollapsed" [class.glyphicon-plus]="panelControllers.isCollapsed"></span>
			</div>
			<ul *ngIf="!panelControllers.isCollapsed" class="list-group list-group-flush">
				<li *ngFor="let ctrl of controllersList" class="list-group-item">{{ctrl.key}} &bull; {{ctrl.description}}</li>
			</ul>
		</div>

		<button type="button" (click)="doLogout()" class="btn btn-danger"><span class="glyphicon glyphicon-log-out"></span>&nbsp;&nbsp;{{i18n.btnLogout}}</button>
	`
})
export class HomeComponent implements OnDestroy
{
	public get i18n() { return Config.i18n; }
	public status: IStatus | null = null;
	public clientsList: { key: string; description: string; }[] | null = null;
	public controllersList: { key: string; description: string; }[] | null = null;
	public isBusy = false;
	private refreshTask = 0;

	constructor(private http: Http)
	{
		this.refresh();
	}

	public ngOnDestroy()
	{
		clearInterval(this.refreshTask);
	}

	public doLogout()
	{
		if (this.isBusy) return;
		Config.currentUser = null;
		this.http.get(Config.URL.logout).subscribe(() => Config.jumpToPage());
	}

	private refresh()
	{
		if (this.isBusy) return;

		this.isBusy = true;

		this.http.get(Config.URL.status)
			.pipe(map(r => r.json() as IStatus))
			.subscribe(r =>
			{
				if (!this.refreshTask) this.refreshTask = setInterval(this.refresh.bind(this), 5000);

				if (r.started) r.started = new Date(r.started);
				this.status = r;

				if (r.clients) {
					this.clientsList = [];
					for (const key in r.clients) this.clientsList.push({ key, description: r.clients[key] });
				} else {
					this.clientsList = null;
				}

				if (r.controllers) {
					this.controllersList = [];
					for (const key in r.controllers) this.controllersList.push({ key, description: r.controllers[key] });
				} else {
					this.controllersList = null;
				}

				this.isBusy = false;
			}, err =>
				{
					this.isBusy = false;

					// Assume any error is failure to login
					Config.jumpToPage();
				});
	}
}
