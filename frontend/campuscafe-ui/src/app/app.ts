import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/navbar/navbar';
import { ChatbotComponent } from './shared/chatbot/chatbot';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, ChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App { }
