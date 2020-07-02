import { Component, Inject, OnInit } from '@angular/core'
import { MAT_DIALOG_DATA } from '@angular/material/dialog'

export interface DialogData {
  pointUrl: string
}

@Component({
  selector: 'app-share-dialog',
  templateUrl: 'share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss']
})
export class ShareDialogComponent implements OnInit {
  constructor (@Inject(MAT_DIALOG_DATA) private data: DialogData) {}
  public shareUrl: string

  ngOnInit (): void {
    const current = new URL(window.location.toString())
    this.shareUrl = `${current.origin}${current.pathname}?pointUrl=${this.data.pointUrl}`
  }

  public copyToClipboard () {
    const tempInput = document.createElement('input')
    tempInput.value = this.shareUrl
    document.body.appendChild(tempInput)
    tempInput.select()
    document.execCommand('copy')
    document.body.removeChild(tempInput)
  }
}
