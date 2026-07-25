import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { BatchAddToCartDto } from './dto/batch-add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Controller('cart')
@UseGuards(JwtAccessGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getActiveCart(@Req() req: any) {
    const customerId = req.user.id;
    return this.cartService.getOrCreateActiveCart(customerId);
  }

  @Post('items')
  addToCart(@Req() req: any, @Body() dto: AddToCartDto) {
    const customerId = req.user.id;
    const userRole = req.user.role;
    return this.cartService.addToCart(customerId, dto, userRole);
  }

  @Post('items/batch')
  batchAddToCart(@Req() req: any, @Body() dto: BatchAddToCartDto) {
    const customerId = req.user.id;
    const userRole = req.user.role;
    return this.cartService.batchAddToCart(customerId, dto, userRole);
  }

  @Patch('items/:id')
  updateCartItem(
    @Req() req: any,
    @Param('id') cartItemId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const customerId = req.user.id;
    return this.cartService.updateCartItem(customerId, cartItemId, dto);
  }

  @Delete('items/:id')
  removeCartItem(@Req() req: any, @Param('id') cartItemId: string) {
    const customerId = req.user.id;
    return this.cartService.removeCartItem(customerId, cartItemId);
  }

  @Delete('clear')
  clearCart(@Req() req: any) {
    const customerId = req.user.id;
    return this.cartService.clearCart(customerId);
  }
}
