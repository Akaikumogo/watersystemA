import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public } from '../../common/decorators/public.decorator';
import {
  LoginResponseDto,
  RegisterResponseDto,
  UserResponseDto
} from './dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Register a new user (Admin only)',
    description:
      'Create a new user account. Only admins can create users with any role.'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required'
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - username already exists'
  })
  async register(@Body() dto: RegisterDto, @Req() req: any) {
    const role = req.user?.role ?? 'USER';
    return this.authService.register(dto, role);
  }

  @ApiOperation({
    summary: 'Register a new client user',
    description:
      'Public endpoint to register a new user with USER role. No authentication required.'
  })
  @Public()
  @Post('register-client')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: RegisterResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - username already exists'
  })
  async registerClient(@Body() dto: RegisterDto) {
    return this.authService.registerClient(dto);
  }

  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user and receive JWT access token'
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: LoginResponseDto
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials'
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: 'Get current user information',
    description: 'Get the authenticated user information from JWT token'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: UserResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token'
  })
  async getMe(@Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.authService.getCurrentUser(userId);
  }

  @ApiOperation({
    summary: 'Update user preferences (language)',
    description: 'Update user language preference and sync to all user devices'
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Preferences updated successfully',
    type: UserResponseDto
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token'
  })
  async updatePreferences(@Body() dto: UpdatePreferencesDto, @Req() req: any) {
    const userId = req.user?.userId ?? req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User ID not found in token');
    }
    return this.authService.updateLanguage(userId, dto.language);
  }
}
