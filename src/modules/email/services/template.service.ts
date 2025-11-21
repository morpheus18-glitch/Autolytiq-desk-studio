/**
 * EMAIL TEMPLATE SERVICE
 *
 * Manages email templates with variable substitution.
 * Provides template rendering with safety checks.
 */

import {
  EmailTemplate,
  EmailTemplateSchema,
  ApplyTemplateRequest,
  EmailModuleError,
  EmailErrorCode,
} from '../types/email.types';

// ============================================================================
// TEMPLATE SERVICE
// ============================================================================

export class TemplateService {
  /**
   * Apply template with variables
   */
  async applyTemplate(
    request: ApplyTemplateRequest
  ): Promise<{ subject: string; bodyHtml: string; bodyText: string }> {
    // In a real implementation, this would fetch template from database
    // For now, return a simple implementation

    const template = await this.getTemplate(request.templateId);

    if (!template) {
      throw new EmailModuleError(
        'Template not found',
        EmailErrorCode.TEMPLATE_NOT_FOUND,
        { templateId: request.templateId }
      );
    }

    try {
      // Replace variables in template
      const subject = this.replaceVariables(template.subject, request.variables);
      const bodyHtml = this.replaceVariables(template.bodyHtml, request.variables);
      const bodyText = this.replaceVariables(template.bodyText, request.variables);

      return {
        subject,
        bodyHtml,
        bodyText,
      };
    } catch (error) {
      throw new EmailModuleError(
        'Template rendering failed',
        EmailErrorCode.TEMPLATE_RENDER_ERROR,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Get template by ID
   */
  private async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    // TODO: Fetch from database
    // For now, return null (templates not yet implemented in DB)
    return null;
  }

  /**
   * Replace variables in template string
   */
  private replaceVariables(
    template: string,
    variables: Record<string, string>
  ): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      // Replace {{variable}} with value
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Validate required template variables
   */
  validateVariables(
    template: EmailTemplate,
    variables: Record<string, string>
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const variable of template.variables) {
      if (variable.required && !variables[variable.name]) {
        missing.push(variable.name);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

// Export singleton instance
export const templateService = new TemplateService();
