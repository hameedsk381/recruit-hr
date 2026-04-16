/**
 * E-Signature Service
 * Supports DocuSign (primary) and Adobe Sign (fallback)
 * Manual signing as no-integration fallback
 */

export interface DocuSignWebhookPayload {
  envelopeId: string;
  status: string; // 'completed' | 'declined' | 'voided'
  recipientEmail?: string;
}

export class ESignService {
  private static docusignApiBase = process.env.DOCUSIGN_API_BASE || 'https://demo.docusign.net/restapi';
  private static docusignAccountId = process.env.DOCUSIGN_ACCOUNT_ID || '';
  private static docusignAccessToken = process.env.DOCUSIGN_ACCESS_TOKEN || '';

  /**
   * Send offer letter for e-signature via DocuSign
   * Returns the envelope ID
   */
  static async sendForSignature(params: {
    candidateName: string;
    candidateEmail: string;
    offerLetterHtml: string;
    offerId: string;
  }): Promise<string> {
    if (!this.docusignAccountId || !this.docusignAccessToken) {
      // Fallback: return a placeholder envelope ID for manual signing
      console.warn('[ESign] DocuSign not configured, using manual signing fallback');
      return `manual_${params.offerId}`;
    }

    const envelope = {
      emailSubject: 'Please sign your offer letter',
      documents: [
        {
          documentBase64: Buffer.from(params.offerLetterHtml).toString('base64'),
          name: 'Offer Letter',
          fileExtension: 'html',
          documentId: '1',
        },
      ],
      recipients: {
        signers: [
          {
            email: params.candidateEmail,
            name: params.candidateName,
            recipientId: '1',
            tabs: {
              signHereTabs: [{ anchorString: '/sig1/', anchorXOffset: '20', anchorYOffset: '10' }],
              dateSignedTabs: [{ anchorString: '/date1/', anchorXOffset: '20', anchorYOffset: '10' }],
            },
          },
        ],
      },
      status: 'sent',
    };

    const response = await fetch(
      `${this.docusignApiBase}/v2.1/accounts/${this.docusignAccountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.docusignAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelope),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DocuSign error: ${err}`);
    }

    const data = await response.json() as { envelopeId: string };
    return data.envelopeId;
  }

  /**
   * Parse DocuSign webhook and determine signing outcome
   */
  static parseWebhook(payload: DocuSignWebhookPayload): { envelopeId: string; status: 'accepted' | 'declined' | null } {
    if (payload.status === 'completed') return { envelopeId: payload.envelopeId, status: 'accepted' };
    if (payload.status === 'declined' || payload.status === 'voided') return { envelopeId: payload.envelopeId, status: 'declined' };
    return { envelopeId: payload.envelopeId, status: null };
  }
}
