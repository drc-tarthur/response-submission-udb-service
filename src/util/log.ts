/* istanbul ignore file */
enum _levels {
    trace= 0,
    debug,
    info,
    warn,
    error,
    fatal,
  }
  
  export class Log {
  
    static functionLog(f: any, context: any) {
      return new Log(f.name, context);
    }
  
    static classLog(obj: any, context: any) {
      return new Log(obj.constructor.name, context);
    }
  
    static genericLog(name: string, context: any = null) {
      return new Log(name, context);
    }
    readonly levels = _levels;
    currentLevel: _levels;
  
    constructor(public name: string, public context: string, level= null) {
      this.currentLevel = level || _levels[process.env.LOG_LEVEL] || _levels.debug;
    }
  
    log(level: _levels, ...items) {
      if (level < this.currentLevel) { return; }
      try {
        // const ts = new Date();
        // const logItems = items.map((x) => x instanceof Object ? x instanceof Error ? JSON.stringify(omit(x,'stack'), Object.getOwnPropertyNames(x)) : JSON.stringify(x) : x);
        // const message = `${ts.toISOString()} $ ${this.context} : [${this.name}] ${_levels[level].toUpperCase()} - ${logItems.join(' ')}`;
        if (level < _levels.error) {
          console.log(items);
        } else {
          console.error(items);
        }
  
      } catch (e) {
        console.error('logging error', e);
      }
    }
  
    trace(...items) { this.log(_levels.trace, ...items); }
    debug(...items) { this.log(_levels.debug, ...items); }
    info(...items) { this.log(_levels.info, ...items); }
    warn(...items) { this.log(_levels.warn, ...items); }
    error(...items) { this.log(_levels.error, ...items); }
    fatal(...items) { this.log(_levels.fatal, ...items); }
  
  }