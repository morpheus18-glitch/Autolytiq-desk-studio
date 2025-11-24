import { describe, it, expect } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Auth Service API Contract', () => {
  const contractPath = join(__dirname, '../../shared/contracts/auth-service.yaml');

  // Read and parse the YAML file
  const loadContract = () => {
    const content = readFileSync(contractPath, 'utf8');
    return load(content);
  };

  it('should have valid OpenAPI spec', async () => {
    const contract = loadContract();
    const api = await SwaggerParser.validate(contract);
    expect(api).toBeDefined();
    expect(api.openapi).toBe('3.0.0');
    expect(api.info.title).toBe('Auth Service API');
    expect(api.info.version).toBe('1.0.0');
  });

  it('should define all required auth endpoints', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    // Authentication endpoints
    expect(api.paths['/api/auth/login']).toBeDefined();
    expect(api.paths['/api/auth/login'].post).toBeDefined();

    expect(api.paths['/api/auth/logout']).toBeDefined();
    expect(api.paths['/api/auth/logout'].post).toBeDefined();

    expect(api.paths['/api/auth/refresh']).toBeDefined();
    expect(api.paths['/api/auth/refresh'].post).toBeDefined();

    // MFA endpoints
    expect(api.paths['/api/auth/mfa/setup']).toBeDefined();
    expect(api.paths['/api/auth/mfa/setup'].post).toBeDefined();

    expect(api.paths['/api/auth/mfa/verify']).toBeDefined();
    expect(api.paths['/api/auth/mfa/verify'].post).toBeDefined();

    // Password reset endpoints
    expect(api.paths['/api/auth/password/reset-request']).toBeDefined();
    expect(api.paths['/api/auth/password/reset-request'].post).toBeDefined();

    expect(api.paths['/api/auth/password/reset']).toBeDefined();
    expect(api.paths['/api/auth/password/reset'].post).toBeDefined();
  });

  it('should define required request schemas', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    expect(api.components.schemas.LoginRequest).toBeDefined();
    expect(api.components.schemas.LoginRequest.required).toContain('email');
    expect(api.components.schemas.LoginRequest.required).toContain('password');

    expect(api.components.schemas.RefreshTokenRequest).toBeDefined();
    expect(api.components.schemas.RefreshTokenRequest.required).toContain('refreshToken');

    expect(api.components.schemas.MFAVerifyRequest).toBeDefined();
    expect(api.components.schemas.MFAVerifyRequest.required).toContain('code');

    expect(api.components.schemas.PasswordResetRequest).toBeDefined();
    expect(api.components.schemas.PasswordResetRequest.required).toContain('email');

    expect(api.components.schemas.PasswordResetConfirm).toBeDefined();
    expect(api.components.schemas.PasswordResetConfirm.required).toContain('token');
    expect(api.components.schemas.PasswordResetConfirm.required).toContain('newPassword');
  });

  it('should define required response schemas', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    expect(api.components.schemas.LoginResponse).toBeDefined();
    expect(api.components.schemas.LoginResponse.required).toContain('accessToken');
    expect(api.components.schemas.LoginResponse.required).toContain('refreshToken');
    expect(api.components.schemas.LoginResponse.required).toContain('expiresIn');
    expect(api.components.schemas.LoginResponse.required).toContain('user');

    expect(api.components.schemas.TokenResponse).toBeDefined();
    expect(api.components.schemas.TokenResponse.required).toContain('accessToken');
    expect(api.components.schemas.TokenResponse.required).toContain('refreshToken');
    expect(api.components.schemas.TokenResponse.required).toContain('expiresIn');

    expect(api.components.schemas.MFASetupResponse).toBeDefined();
    expect(api.components.schemas.MFASetupResponse.required).toContain('secret');
    expect(api.components.schemas.MFASetupResponse.required).toContain('qrCodeUrl');

    expect(api.components.schemas.User).toBeDefined();
    expect(api.components.schemas.User.required).toContain('id');
    expect(api.components.schemas.User.required).toContain('email');
    expect(api.components.schemas.User.required).toContain('name');
    expect(api.components.schemas.User.required).toContain('role');
    expect(api.components.schemas.User.required).toContain('dealershipId');
    expect(api.components.schemas.User.required).toContain('mfaEnabled');
  });

  it('should define security scheme for protected endpoints', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    expect(api.components.securitySchemes.bearerAuth).toBeDefined();
    expect(api.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(api.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(api.components.securitySchemes.bearerAuth.bearerFormat).toBe('JWT');

    // Verify logout requires authentication
    expect(api.paths['/api/auth/logout'].post.security).toBeDefined();
    expect(api.paths['/api/auth/logout'].post.security[0]).toHaveProperty('bearerAuth');

    // Verify MFA setup requires authentication
    expect(api.paths['/api/auth/mfa/setup'].post.security).toBeDefined();
    expect(api.paths['/api/auth/mfa/setup'].post.security[0]).toHaveProperty('bearerAuth');

    // Verify MFA verify requires authentication
    expect(api.paths['/api/auth/mfa/verify'].post.security).toBeDefined();
    expect(api.paths['/api/auth/mfa/verify'].post.security[0]).toHaveProperty('bearerAuth');
  });

  it('should define proper HTTP status codes for login endpoint', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    const loginEndpoint = api.paths['/api/auth/login'].post;

    expect(loginEndpoint.responses['200']).toBeDefined();
    expect(loginEndpoint.responses['401']).toBeDefined();
    expect(loginEndpoint.responses['422']).toBeDefined();
    expect(loginEndpoint.responses['500']).toBeDefined();
  });

  it('should validate email format in request schemas', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    const loginRequest = api.components.schemas.LoginRequest;
    expect(loginRequest.properties.email.format).toBe('email');

    const passwordResetRequest = api.components.schemas.PasswordResetRequest;
    expect(passwordResetRequest.properties.email.format).toBe('email');

    const user = api.components.schemas.User;
    expect(user.properties.email.format).toBe('email');
  });

  it('should validate password constraints', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    const loginRequest = api.components.schemas.LoginRequest;
    expect(loginRequest.properties.password.minLength).toBe(8);

    const passwordResetConfirm = api.components.schemas.PasswordResetConfirm;
    expect(passwordResetConfirm.properties.newPassword.minLength).toBe(8);
    expect(passwordResetConfirm.properties.newPassword.pattern).toBeDefined();
  });

  it('should validate MFA code format', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    const loginRequest = api.components.schemas.LoginRequest;
    expect(loginRequest.properties.mfaCode.pattern).toBe('^[0-9]{6}$');

    const mfaVerifyRequest = api.components.schemas.MFAVerifyRequest;
    expect(mfaVerifyRequest.properties.code.pattern).toBe('^[0-9]{6}$');
  });

  it('should define user roles enum', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    const user = api.components.schemas.User;
    expect(user.properties.role.enum).toEqual([
      'admin',
      'manager',
      'salesperson',
      'viewer'
    ]);
  });

  it('should define UUID format for identifiers', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    const user = api.components.schemas.User;
    expect(user.properties.id.format).toBe('uuid');
    expect(user.properties.dealershipId.format).toBe('uuid');
  });

  it('should define comprehensive error responses', async () => {
    const api = await SwaggerParser.dereference(loadContract());

    expect(api.components.schemas.Error).toBeDefined();
    expect(api.components.schemas.Error.required).toContain('error');

    expect(api.components.schemas.ValidationError).toBeDefined();
    expect(api.components.schemas.ValidationError.required).toContain('error');
    expect(api.components.schemas.ValidationError.required).toContain('details');

    expect(api.components.responses.Unauthorized).toBeDefined();
    expect(api.components.responses.ValidationError).toBeDefined();
    expect(api.components.responses.InternalError).toBeDefined();
  });
});
