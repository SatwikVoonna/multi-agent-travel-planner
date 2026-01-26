import { BaseAgent } from './baseAgent';
import { AgentMessage, WeatherData } from '@/types/agent';

const OPENWEATHER_API_KEY = ''; // Will use mock data if not set

interface WeatherInput {
  destination: string;
  startDate: Date;
  endDate: Date;
}

export class WeatherAgent extends BaseAgent {
  constructor() {
    super('weather');
  }

  protected handleMessage(message: AgentMessage): void {
    console.log(`[WeatherAgent] Received: ${message.content}`);
  }

  async process(input: WeatherInput): Promise<WeatherData[]> {
    this.setStatus('thinking');
    this.sendMessage('coordinator', `Fetching weather data for ${input.destination}`, 'notification');

    await this.simulateDelay(800);

    try {
      const weatherData = await this.fetchWeatherData(input);
      this.setStatus('completed');
      this.sendMessage('coordinator', `Weather data retrieved: ${weatherData.length} days analyzed`, 'response');
      return weatherData;
    } catch (error) {
      this.setStatus('error');
      this.sendMessage('coordinator', 'Failed to fetch weather data, using estimates', 'notification');
      return this.generateMockWeather(input);
    }
  }

  private async fetchWeatherData(input: WeatherInput): Promise<WeatherData[]> {
    // Try to use OpenWeatherMap free tier
    if (OPENWEATHER_API_KEY) {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(input.destination)}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        if (response.ok) {
          const data = await response.json();
          return this.parseOpenWeatherData(data, input);
        }
      } catch (e) {
        console.log('OpenWeather API failed, using mock data');
      }
    }
    
    return this.generateMockWeather(input);
  }

  private parseOpenWeatherData(data: any, input: WeatherInput): WeatherData[] {
    const days: WeatherData[] = [];
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount && i < data.list.length; i++) {
      const forecast = data.list[i * 8] || data.list[data.list.length - 1];
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      days.push({
        date: date.toISOString().split('T')[0],
        temperature: Math.round(forecast.main.temp),
        condition: forecast.weather[0].main,
        icon: forecast.weather[0].icon,
        humidity: forecast.main.humidity,
        windSpeed: forecast.wind.speed,
        suitable: this.isWeatherSuitable(forecast.weather[0].main),
      });
    }

    return days;
  }

  private generateMockWeather(input: WeatherInput): WeatherData[] {
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Clear'];
    const icons = ['☀️', '⛅', '☁️', '🌧️', '🌤️'];
    const days: WeatherData[] = [];
    
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const conditionIndex = Math.floor(Math.random() * conditions.length);
      const condition = conditions[conditionIndex];

      days.push({
        date: date.toISOString().split('T')[0],
        temperature: Math.round(20 + Math.random() * 15),
        condition,
        icon: icons[conditionIndex],
        humidity: Math.round(40 + Math.random() * 40),
        windSpeed: Math.round(5 + Math.random() * 20),
        suitable: this.isWeatherSuitable(condition),
      });
    }

    return days;
  }

  private isWeatherSuitable(condition: string): boolean {
    const unsuitable = ['Heavy Rain', 'Thunderstorm', 'Snow', 'Extreme'];
    return !unsuitable.some(u => condition.toLowerCase().includes(u.toLowerCase()));
  }

  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const weatherAgent = new WeatherAgent();
