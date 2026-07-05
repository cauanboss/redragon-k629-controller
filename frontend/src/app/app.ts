import { Component } from '@angular/core';
import { KeyboardComponent } from './components/keyboard/keyboard.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { ProfilesComponent } from './components/profiles/profiles.component';
import { StatusBarComponent } from './components/status-bar/status-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    KeyboardComponent,
    ToolbarComponent,
    ProfilesComponent,
    StatusBarComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {}
