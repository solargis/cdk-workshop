import { TranslateLoader } from '@ngx-translate/core'
import sk from '../assets/i18n/sk.json'
import en from '../assets/i18n/en.json'
import { of, Observable } from 'rxjs'

export class TranslationBasicLoader implements TranslateLoader {
  languages = {
    sk,
    en
  }

  getTranslation (lang: string): Observable<any> {
    return of(this.languages[lang])
  }
}
