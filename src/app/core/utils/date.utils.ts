/**
 * UTILIDADES DE FECHA CENTRALIZADAS
 * Proporciona métodos normalizados para comparaciones de fechas en todo el sistema.
 */

export class DateUtils {
    
    /**
     * Convierte cualquier entrada a un objeto Date y lo normaliza a las 00:00:00.000
     * @param date Fecha en formato string (ISO, YYYY-MM-DD) o Date
     */
    static normalize(date: Date | string): Date {
        if (!date) return new Date();
        
        let d: Date;
        if (typeof date === 'string') {
            // Si es YYYY-MM-DD (10 chars), forzar a interpretación local para evitar desfase UTC
            if (date.length === 10 && date.includes('-')) {
                const [year, month, day] = date.split('-').map(Number);
                d = new Date(year, month - 1, day);
            } else {
                d = new Date(date);
            }
        } else {
            d = new Date(date);
        }
        
        d.setHours(0, 0, 0, 0);
        return d;
    }

    /**
     * Compara una fecha de vencimiento contra una fecha de referencia (por defecto hoy)
     * @returns true si la fecha de vencimiento es estrictamente menor a la de referencia
     */
    static isOverdue(dueDate: Date | string, referenceDate: Date = new Date()): boolean {
        const v = this.normalize(dueDate);
        const r = this.normalize(referenceDate);
        return v < r;
    }

    /**
     * Calcula la diferencia en días naturales (enteros) entre dos fechas
     */
    static daysDifference(date1: Date | string, date2: Date | string): number {
        const d1 = this.normalize(date1);
        const d2 = this.normalize(date2);
        
        const diffMs = Math.abs(d1.getTime() - d2.getTime());
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    /**
     * Verifica si una fecha coincide con el día de "hoy" (ignorando horas)
     */
    static isToday(date: Date | string): boolean {
        const d = this.normalize(date);
        const hoy = this.normalize(new Date());
        return d.getTime() === hoy.getTime();
    }

    /**
     * Helper para obtener la fecha formateada en DD/MM/YYYY sin desfases UTC
     */
    static formatShort(date: Date | string): string {
        const d = this.normalize(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    /**
     * Formateo compatible con Intl.DateTimeFormat para Colombia (America/Bogota)
     */
    static formatColombia(date: Date | string): string {
        if (!date) return '—';
        
        let valueToParse = date;
        // Parche para forzar UTC si detectamos formato ISO sin zona (evita desfases en navegadores)
        if (typeof date === 'string' && date.includes('T') && !date.endsWith('Z') && !date.includes('+')) {
            valueToParse = date + 'Z';
        }

        const dateObj = new Date(valueToParse);
        return new Intl.DateTimeFormat('es-CO', {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(dateObj);
    }
}
