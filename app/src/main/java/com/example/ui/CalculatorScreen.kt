package com.example.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun CalculatorScreen(onUnlock: () -> Unit) {
    var display by remember { mutableStateOf("0") }
    var equation by remember { mutableStateOf("") }
    var waitingForOperand by remember { mutableStateOf(false) }
    var prevValue by remember { mutableStateOf<Double?>(null) }
    var operator by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF17171C))
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top status row
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text("RAD", color = Color(0xFF64748B), fontSize = 12.sp, fontWeight = FontWeight.Bold)
            Text("Calculator", color = Color(0xFF64748B), fontSize = 12.sp)
        }

        // Display Area
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
                .padding(bottom = 16.dp),
            verticalArrangement = Arrangement.Bottom,
            horizontalAlignment = Alignment.End
        ) {
            Text(
                text = equation,
                color = Color(0xFF94A3B8),
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = display,
                color = Color.White,
                fontSize = if (display.length > 8) 40.sp else 64.sp,
                fontWeight = FontWeight.Light,
                maxLines = 1,
                modifier = Modifier.testTag("calculator_display")
            )
        }

        // Keypad Grid
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            val numBg = Color(0xFF2E2F38)
            val secBg = Color(0xFF4E505F)
            val opBg = Color(0xFF4B5EFC)

            // Row 1: C, +/-, %, ÷
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("C", secBg, Modifier.weight(1f), testTag = "btn_clear") {
                    display = "0"
                    equation = ""
                    prevValue = null
                    operator = null
                    waitingForOperand = false
                }
                CalcButton("+/-", secBg, Modifier.weight(1f), testTag = "btn_negate") {
                    val d = display.toDoubleOrNull() ?: 0.0
                    display = (d * -1).toString().removeSuffix(".0")
                }
                CalcButton("%", secBg, Modifier.weight(1f), testTag = "btn_percent") {
                    val d = display.toDoubleOrNull() ?: 0.0
                    display = (d / 100).toString()
                }
                CalcButton("÷", opBg, Modifier.weight(1f), testTag = "btn_divide") {
                    prevValue = display.toDoubleOrNull()
                    operator = "÷"
                    equation = "$display ÷"
                    waitingForOperand = true
                }
            }

            // Row 2: 7, 8, 9, ×
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("7", numBg, Modifier.weight(1f), testTag = "btn_7") {
                    display = if (waitingForOperand || display == "0") "7" else display + "7"
                    waitingForOperand = false
                }
                CalcButton("8", numBg, Modifier.weight(1f), testTag = "btn_8") {
                    display = if (waitingForOperand || display == "0") "8" else display + "8"
                    waitingForOperand = false
                }
                CalcButton("9", numBg, Modifier.weight(1f), testTag = "btn_9") {
                    display = if (waitingForOperand || display == "0") "9" else display + "9"
                    waitingForOperand = false
                }
                CalcButton("×", opBg, Modifier.weight(1f), testTag = "btn_multiply") {
                    prevValue = display.toDoubleOrNull()
                    operator = "×"
                    equation = "$display ×"
                    waitingForOperand = true
                }
            }

            // Row 3: 4, 5, 6, -
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("4", numBg, Modifier.weight(1f), testTag = "btn_4") {
                    display = if (waitingForOperand || display == "0") "4" else display + "4"
                    waitingForOperand = false
                }
                CalcButton("5", numBg, Modifier.weight(1f), testTag = "btn_5") {
                    display = if (waitingForOperand || display == "0") "5" else display + "5"
                    waitingForOperand = false
                }
                CalcButton("6", numBg, Modifier.weight(1f), testTag = "btn_6") {
                    display = if (waitingForOperand || display == "0") "6" else display + "6"
                    waitingForOperand = false
                }
                CalcButton("-", opBg, Modifier.weight(1f), testTag = "btn_subtract") {
                    prevValue = display.toDoubleOrNull()
                    operator = "-"
                    equation = "$display -"
                    waitingForOperand = true
                }
            }

            // Row 4: 1, 2, 3, +
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("1", numBg, Modifier.weight(1f), testTag = "btn_1") {
                    display = if (waitingForOperand || display == "0") "1" else display + "1"
                    waitingForOperand = false
                }
                CalcButton("2", numBg, Modifier.weight(1f), testTag = "btn_2") {
                    display = if (waitingForOperand || display == "0") "2" else display + "2"
                    waitingForOperand = false
                }
                CalcButton("3", numBg, Modifier.weight(1f), testTag = "btn_3") {
                    display = if (waitingForOperand || display == "0") "3" else display + "3"
                    waitingForOperand = false
                }
                CalcButton("+", opBg, Modifier.weight(1f), testTag = "btn_add") {
                    prevValue = display.toDoubleOrNull()
                    operator = "+"
                    equation = "$display +"
                    waitingForOperand = true
                }
            }

            // Row 5: ⌫, 0, ., =
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                CalcButton("⌫", numBg, Modifier.weight(1f), testTag = "btn_backspace") {
                    display = if (display.length > 1) display.dropLast(1) else "0"
                }
                CalcButton("0", numBg, Modifier.weight(1f), testTag = "btn_0") {
                    display = if (waitingForOperand || display == "0") "0" else display + "0"
                    waitingForOperand = false
                }
                CalcButton(".", numBg, Modifier.weight(1f), testTag = "btn_decimal") {
                    if (!display.contains(".")) {
                        display = if (waitingForOperand) "0." else "$display."
                        waitingForOperand = false
                    }
                }
                CalcButton("=", opBg, Modifier.weight(1f), testTag = "btn_equals") {
                    // Secret Trigger Check: 2580 + "="
                    if (display.trim() == "2580") {
                        onUnlock()
                    } else {
                        val current = display.toDoubleOrNull() ?: 0.0
                        val prev = prevValue
                        val op = operator
                        if (prev != null && op != null) {
                            val res = when (op) {
                                "+" -> prev + current
                                "-" -> prev - current
                                "×" -> prev * current
                                "÷" -> if (current != 0.0) prev / current else 0.0
                                else -> current
                            }
                            equation = "$prev $op $current ="
                            display = res.toString().removeSuffix(".0")
                            prevValue = null
                            operator = null
                            waitingForOperand = true
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CalcButton(
    text: String,
    bg: Color,
    modifier: Modifier = Modifier,
    testTag: String = "",
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(68.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(bg)
            .clickable { onClick() }
            .testTag(testTag),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = text,
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Medium
        )
    }
}
